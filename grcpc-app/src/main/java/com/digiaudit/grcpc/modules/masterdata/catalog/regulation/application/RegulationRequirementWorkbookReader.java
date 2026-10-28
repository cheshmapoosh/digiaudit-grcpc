package com.digiaudit.grcpc.modules.masterdata.catalog.regulation.application;

import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.api.dto.RegulationRequirementImportDtos.Issue;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.zip.ZipInputStream;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.xml.sax.SAXException;
import org.xml.sax.helpers.DefaultHandler;

/** Reads only the six-column import format, never formulas, macros or external resources. */
@Component
public class RegulationRequirementWorkbookReader {
  public static final int MAX_ROWS = 500;
  public static final int MAX_FILE_BYTES = 2 * 1024 * 1024;
  private static final int MAX_EXPANDED_BYTES = 16 * 1024 * 1024;
  private static final String NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  private static final String REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  private static final List<String> HEADERS =
      List.of("عنوان الزام", "شرح الزام", "کد الزام", "ترتیب نمایش", "اعتبار از", "اعتبار تا");
  private static final List<String> FIELDS =
      List.of("title", "description", "code", "sortOrder", "validFrom", "validTo");
  private static final Pattern CELL_REFERENCE = Pattern.compile("([A-Z]{1,3})([1-9][0-9]{0,6})");

  public record RawRow(int rowNumber, List<String> cells) {}
  public record Parsed(String digest, List<RawRow> rows, List<Issue> issues) {}

  public Parsed read(MultipartFile file) {
    if (file.isEmpty() || file.getSize() > MAX_FILE_BYTES) return invalid("FILE_SIZE");
    if (file.getOriginalFilename() == null
        || !file.getOriginalFilename().toLowerCase(Locale.ROOT).endsWith(".xlsx")) {
      return invalid("FILE_FORMAT");
    }
    try (var input = file.getInputStream()) {
      byte[] bytes = input.readNBytes(MAX_FILE_BYTES + 1);
      if (bytes.length > MAX_FILE_BYTES) return invalid("FILE_SIZE");
      Map<String, byte[]> entries = unzip(bytes);
      var workbook = xml(required(entries, "xl/workbook.xml"));
      var relationships = xml(required(entries, "xl/_rels/workbook.xml.rels"));
      String sheetPath = requirementSheetPath(workbook, relationships);
      var shared = sharedStrings(entries);
      return readSheet(digest(bytes), xml(required(entries, sheetPath)), shared);
    } catch (IOException | SAXException | IllegalArgumentException e) {
      return invalid("FILE_FORMAT");
    }
  }

  private Map<String, byte[]> unzip(byte[] bytes) throws IOException {
    Map<String, byte[]> entries = new HashMap<>();
    int expanded = 0;
    int entryCount = 0;
    try (var zip = new ZipInputStream(new ByteArrayInputStream(bytes))) {
      java.util.zip.ZipEntry entry;
      while ((entry = zip.getNextEntry()) != null) {
        if (++entryCount > 128) throw new IOException("Too many workbook entries");
        String name = entry.getName();
        if (name.contains("..") || name.contains("\\") || name.startsWith("/")
            || name.toLowerCase(Locale.ROOT).contains("vbaproject")
            || name.startsWith("xl/externalLinks/")) throw new IOException("Unsupported workbook entry");
        byte[] content = zip.readNBytes(MAX_EXPANDED_BYTES - expanded + 1);
        expanded += content.length;
        if (expanded > MAX_EXPANDED_BYTES || entries.putIfAbsent(name, content) != null) {
          throw new IOException("Invalid workbook archive");
        }
      }
    }
    String types = new String(required(entries, "[Content_Types].xml"), java.nio.charset.StandardCharsets.UTF_8);
    if (!types.contains("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml")) {
      throw new IOException("Only XLSX workbooks are supported");
    }
    return entries;
  }

  private Document xml(byte[] bytes) throws IOException, SAXException {
    try {
      var factory = DocumentBuilderFactory.newInstance();
      factory.setNamespaceAware(true);
      factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
      factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
      factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
      factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
      factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
      factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
      factory.setAttribute("jdk.xml.maxElementDepth", "64");
      factory.setXIncludeAware(false);
      factory.setExpandEntityReferences(false);
      var builder = factory.newDocumentBuilder();
      builder.setErrorHandler(new DefaultHandler());
      return builder.parse(new ByteArrayInputStream(bytes));
    } catch (javax.xml.parsers.ParserConfigurationException e) {
      throw new IllegalStateException("Secure XML parsing is unavailable", e);
    }
  }

  private String requirementSheetPath(Document workbook, Document relationships) {
    var sheets = workbook.getElementsByTagNameNS(NS, "sheet");
    String relationshipId = null;
    Set<String> names = new HashSet<>();
    for (int i = 0; i < sheets.getLength(); i++) {
      var sheet = (Element) sheets.item(i);
      String name = sheet.getAttribute("name");
      if (!names.add(name) || (!name.equals("الزامات") && !name.equals("راهنما"))) {
        throw new IllegalArgumentException("Unexpected worksheet");
      }
      if (name.equals("الزامات")) {
        if (sheet.hasAttribute("state") && !sheet.getAttribute("state").equals("visible")) {
          throw new IllegalArgumentException("Requirements sheet must be visible");
        }
        relationshipId = sheet.getAttributeNS(REL_NS, "id");
      }
    }
    if (relationshipId == null) throw new IllegalArgumentException("Requirements sheet is missing");
    var rels = relationships.getElementsByTagNameNS("*", "Relationship");
    String path = null;
    for (int i = 0; i < rels.getLength(); i++) {
      var rel = (Element) rels.item(i);
      if (rel.getAttribute("TargetMode").equalsIgnoreCase("External")) {
        throw new IllegalArgumentException("External workbook relationships are unsupported");
      }
      if (rel.getAttribute("Id").equals(relationshipId)
          && rel.getAttribute("Type").equals(REL_NS + "/worksheet")) {
        String target = rel.getAttribute("Target");
        path = target.startsWith("/xl/") ? target.substring(1) : "xl/" + target;
      }
    }
    if (path == null || !path.matches("xl/worksheets/[A-Za-z0-9_.-]+\\.xml")) {
      throw new IllegalArgumentException("Invalid worksheet relationship");
    }
    return path;
  }

  private List<String> sharedStrings(Map<String, byte[]> entries) throws IOException, SAXException {
    if (!entries.containsKey("xl/sharedStrings.xml")) return List.of();
    var values = xml(entries.get("xl/sharedStrings.xml")).getElementsByTagNameNS(NS, "si");
    List<String> strings = new ArrayList<>();
    for (int i = 0; i < values.getLength(); i++) strings.add(text((Element) values.item(i)));
    return strings;
  }

  private Parsed readSheet(String digest, Document sheet, List<String> shared) {
    List<RawRow> rows = new ArrayList<>();
    List<Issue> issues = new ArrayList<>();
    var sheetData = sheet.getElementsByTagNameNS(NS, "sheetData");
    if (sheetData.getLength() != 1 || sheet.getElementsByTagNameNS(NS, "mergeCell").getLength() > 0) {
      return invalid("HEADERS");
    }
    boolean headerFound = false;
    int previousRow = 0;
    for (Node node = sheetData.item(0).getFirstChild(); node != null; node = node.getNextSibling()) {
      if (!(node instanceof Element row) || !row.getLocalName().equals("row")) continue;
      int rowNumber = Integer.parseInt(row.getAttribute("r"));
      if (rowNumber <= previousRow || rowNumber > 10001) return invalid("ROW_LIMIT");
      previousRow = rowNumber;
      List<String> values = new ArrayList<>(java.util.Collections.nCopies(HEADERS.size(), ""));
      Set<Integer> columns = new HashSet<>();
      boolean hasData = false;
      for (Node child = row.getFirstChild(); child != null; child = child.getNextSibling()) {
        if (!(child instanceof Element cell) || !cell.getLocalName().equals("c")) continue;
        var reference = CELL_REFERENCE.matcher(cell.getAttribute("r"));
        if (!reference.matches() || Integer.parseInt(reference.group(2)) != rowNumber) return invalid("FILE_FORMAT");
        int column = 0;
        for (char c : reference.group(1).toCharArray()) column = column * 26 + c - 'A' + 1;
        column--;
        if (!columns.add(column)) return invalid("FILE_FORMAT");
        boolean formula = cell.getElementsByTagNameNS(NS, "f").getLength() != 0;
        String value = value(cell, shared);
        if (value.isBlank() && !formula) continue;
        hasData = true;
        if (column >= HEADERS.size()) {
          issues.add(new Issue(rowNumber, "ROW", "EXTRA_COLUMN"));
          continue;
        }
        if (formula || cell.getAttribute("t").equals("e") || cell.getAttribute("t").equals("b")) {
          issues.add(new Issue(rowNumber, FIELDS.get(column), formula ? "FORMULA_NOT_ALLOWED" : "INVALID_CELL"));
        }
        values.set(column, value.trim());
      }
      if (rowNumber == 1) {
        headerFound = values.equals(HEADERS);
      } else if (hasData) {
        rows.add(new RawRow(rowNumber, List.copyOf(values)));
        if (rows.size() > MAX_ROWS) return invalid("ROW_LIMIT");
      }
    }
    if (!headerFound) issues.add(new Issue(1, "FILE", "HEADERS"));
    if (rows.isEmpty()) issues.add(new Issue(0, "FILE", "EMPTY"));
    return new Parsed(digest, List.copyOf(rows), List.copyOf(issues));
  }

  private String value(Element cell, List<String> shared) {
    String type = cell.getAttribute("t");
    if (type.equals("inlineStr")) return text(cell);
    var values = cell.getElementsByTagNameNS(NS, "v");
    String value = values.getLength() == 0 ? "" : values.item(0).getTextContent();
    if (type.equals("s")) {
      int index = Integer.parseInt(value);
      if (index < 0 || index >= shared.size()) throw new IllegalArgumentException("Invalid shared string");
      return shared.get(index);
    }
    if (!type.isEmpty() && !Set.of("n", "str", "d", "b", "e").contains(type)) {
      throw new IllegalArgumentException("Unsupported cell type");
    }
    return value;
  }

  private String text(Element element) {
    var parts = element.getElementsByTagNameNS(NS, "t");
    var text = new StringBuilder();
    for (int i = 0; i < parts.getLength(); i++) {
      if (!"rPh".equals(parts.item(i).getParentNode().getLocalName())) text.append(parts.item(i).getTextContent());
    }
    return text.toString();
  }

  private byte[] required(Map<String, byte[]> entries, String name) throws IOException {
    byte[] value = entries.get(name);
    if (value == null) throw new IOException("Required workbook entry is missing");
    return value;
  }

  static String digest(byte[] bytes) {
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }

  private Parsed invalid(String code) {
    return new Parsed("", List.of(), List.of(new Issue(0, "FILE", code)));
  }
}

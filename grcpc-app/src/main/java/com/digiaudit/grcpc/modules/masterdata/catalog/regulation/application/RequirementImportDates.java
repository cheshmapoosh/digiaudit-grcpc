/*
 * Persian break-year calculation adapted from OpenUI5 sap/ui/core/date/Persian.js.
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under Apache-2.0. See META-INF/LICENSE-UI5-Persian.txt.
 * Modified: strict date validation and conversion using java.time.LocalDate only.
 */
package com.digiaudit.grcpc.modules.masterdata.catalog.regulation.application;

import java.time.DateTimeException;
import java.time.LocalDate;

final class RequirementImportDates {
  private RequirementImportDates() {}

  static String englishDigits(String text) {
    var result = new StringBuilder();
    for (char c : text.toCharArray()) {
      if (c >= '۰' && c <= '۹') result.append((char) ('0' + c - '۰'));
      else if (c >= '٠' && c <= '٩') result.append((char) ('0' + c - '٠'));
      else result.append(c);
    }
    return result.toString();
  }

  static LocalDate parse(String text) {
    if (text.isBlank()) return null;
    String value = englishDigits(text);
    if (value.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")) return LocalDate.parse(value);
    if (!value.matches("[0-9]{4}/[0-9]{1,2}/[0-9]{1,2}")) throw new DateTimeException("Invalid date format");
    String[] parts = value.split("/");
    int year = Integer.parseInt(parts[0]);
    int month = Integer.parseInt(parts[1]);
    int day = Integer.parseInt(parts[2]);
    var calendar = persianYear(year);
    int lastDay = month <= 6 ? 31 : month <= 11 ? 30 : calendar.leap() == 0 ? 30 : 29;
    if (month < 1 || month > 12 || day < 1 || day > lastDay) throw new DateTimeException("Invalid Persian date");
    int offset = (month - 1) * 31 - (month / 7) * (month - 7) + day - 1;
    return LocalDate.of(year + 621, 3, calendar.march()).plusDays(offset);
  }

  // Same Jalaali break-year calculation as the existing UI5 Persian calendar.
  private static PersianYear persianYear(int year) {
    int[] breaks = {-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635,
        2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178};
    if (year < 1 || year >= 3178) throw new DateTimeException("Unsupported Persian year");
    int gy = year + 621;
    int leapJ = -14;
    int previous = breaks[0];
    int jump = 0;
    for (int i = 1; i < breaks.length; i++) {
      jump = breaks[i] - previous;
      if (year < breaks[i]) break;
      leapJ += (jump / 33) * 8 + (jump % 33) / 4;
      previous = breaks[i];
    }
    int n = year - previous;
    leapJ += (n / 33) * 8 + ((n % 33) + 3) / 4;
    if (jump % 33 == 4 && jump - n == 4) leapJ++;
    int leapG = gy / 4 - ((gy / 100 + 1) * 3) / 4 - 150;
    int march = 20 + leapJ - leapG;
    if (jump - n < 6) n = n - jump + ((jump + 4) / 33) * 33;
    int leap = ((n + 1) % 33 - 1) % 4;
    return new PersianYear(march, leap == -1 ? 4 : leap);
  }

  private record PersianYear(int march, int leap) {}
}

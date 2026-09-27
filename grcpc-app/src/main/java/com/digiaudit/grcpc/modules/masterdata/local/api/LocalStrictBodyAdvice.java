package com.digiaudit.grcpc.modules.masterdata.local.api;

import com.digiaudit.grcpc.modules.masterdata.local.application.LocalCommandRules;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.constraints.NotNull;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.lang.reflect.RecordComponent;
import java.lang.reflect.Type;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.RequestBodyAdviceAdapter;

/** Restricts Local command bodies without changing existing Central JSON handling. */
@ControllerAdvice(basePackages = "com.digiaudit.grcpc.modules.masterdata.local.api")
public class LocalStrictBodyAdvice extends RequestBodyAdviceAdapter {
  private final ObjectMapper mapper;
  private final LocalCommandRules rules;

  public LocalStrictBodyAdvice(ObjectMapper mapper, LocalCommandRules rules) {
    this.mapper = mapper;
    this.rules = rules;
  }

  @Override
  public boolean supports(MethodParameter parameter, Type targetType,
      Class<? extends HttpMessageConverter<?>> converterType) {
    Class<?> type = parameter.getParameterType();
    return parameter.getContainingClass().getPackageName()
        .equals("com.digiaudit.grcpc.modules.masterdata.local.api")
        && type.isRecord()
        && Set.of("Create", "Update", "Lifecycle", "Assignment")
            .contains(type.getSimpleName());
  }

  @Override
  public HttpInputMessage beforeBodyRead(HttpInputMessage inputMessage, MethodParameter parameter,
      Type targetType, Class<? extends HttpMessageConverter<?>> converterType) throws IOException {
    byte[] body = inputMessage.getBody().readAllBytes();
    JsonNode root;
    try {
      root = mapper.readTree(body);
    } catch (IOException malformed) {
      return replay(inputMessage, body);
    }
    if (root != null && root.isObject()) {
      Map<String, RecordComponent> fields = Arrays.stream(
              parameter.getParameterType().getRecordComponents())
          .collect(Collectors.toMap(RecordComponent::getName, Function.identity()));
      root.fieldNames().forEachRemaining(name -> {
        if (!fields.containsKey(name)) throw rules.bad("Unsupported Local field: " + name);
      });
      for (RecordComponent component : fields.values()) {
        JsonNode value = root.get(component.getName());
        if (component.isAnnotationPresent(NotNull.class)
            && (value == null || value.isNull())) {
          throw rules.bad("Required Local field is missing: " + component.getName());
        }
      }
      JsonNode version = root.get("version");
      if (version != null && version.isIntegralNumber() && version.longValue() < 0) {
        throw rules.bad("Nonnegative version is required");
      }
    }
    return replay(inputMessage, body);
  }

  private HttpInputMessage replay(HttpInputMessage original, byte[] body) {
    return new HttpInputMessage() {
      @Override public java.io.InputStream getBody() {
        return new ByteArrayInputStream(body);
      }
      @Override public org.springframework.http.HttpHeaders getHeaders() {
        return original.getHeaders();
      }
    };
  }
}

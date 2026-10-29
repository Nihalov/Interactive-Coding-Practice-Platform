package com.nihal.codearena.workspace.service;

import com.nihal.codearena.common.exception.RequestValidationException;
import com.nihal.codearena.workspace.dto.WorkspaceElement;
import com.nihal.codearena.workspace.dto.WorkspaceState;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

@Component
public class WorkspaceValidator {

    public static final int SCHEMA_VERSION = 1;
    private static final int MAX_ELEMENTS = 500;
    private static final int MAX_ARRAY_VALUES = 100;
    private static final int MAX_ERRORS = 20;
    private static final double MAX_COORDINATE = 100_000;

    private static final Set<String> TYPES = Set.of("ARRAY", "POINTER", "VARIABLE", "TEXT", "ARROW");
    private static final Pattern ID_PATTERN = Pattern.compile("[A-Za-z0-9_-]{1,64}");

    public void validate(WorkspaceState state) {
        Map<String, String> errors = new LinkedHashMap<>();

        if (state.schemaVersion() == null || state.schemaVersion() != SCHEMA_VERSION) {
            errors.put("state.schemaVersion", "must be " + SCHEMA_VERSION);
        }
        if (state.elements() == null) {
            errors.put("state.elements", "is required (use an empty list for a blank workspace)");
            fail(errors);
        }

        List<WorkspaceElement> elements = state.elements();
        if (elements.size() > MAX_ELEMENTS) {
            errors.put("state.elements", "at most " + MAX_ELEMENTS + " elements are allowed");
            fail(errors);
        }

        // Pass 1: every element needs a unique, well-formed id and a known type
        Map<String, WorkspaceElement> byId = new HashMap<>();
        for (int i = 0; i < elements.size(); i++) {
            WorkspaceElement e = elements.get(i);
            String p = "elements[" + i + "]";
            if (e == null) {
                errors.put(p, "must not be null");
                continue;
            }
            if (e.id() == null || !ID_PATTERN.matcher(e.id()).matches()) {
                errors.put(p + ".id", "is required: 1 to 64 letters, digits, '-' or '_'");
            } else if (byId.putIfAbsent(e.id(), e) != null) {
                errors.put(p + ".id", "duplicate id '" + e.id() + "'");
            }
            if (e.type() == null || !TYPES.contains(e.type())) {
                errors.put(p + ".type", "must be one of " + TYPES);
            }
        }

        // Pass 2: per-type rules, including references between elements
        for (int i = 0; i < elements.size() && errors.size() < MAX_ERRORS; i++) {
            WorkspaceElement e = elements.get(i);
            if (e == null || e.type() == null || !TYPES.contains(e.type())) {
                continue;
            }
            String p = "elements[" + i + "]";
            switch (e.type()) {
                case "ARRAY" -> checkArray(p, e, errors);
                case "POINTER" -> checkPointer(p, e, byId, errors);
                case "VARIABLE" -> checkVariable(p, e, errors);
                case "TEXT" -> checkText(p, e, errors);
                case "ARROW" -> checkArrow(p, e, byId, errors);
                default -> { }
            }
        }

        fail(errors);
    }

    private void checkArray(String p, WorkspaceElement e, Map<String, String> errors) {
        checkPosition(p, e, errors);
        checkOptionalLength(p + ".name", e.name(), 50, errors);

        List<Object> values = e.values();
        if (values == null) {
            errors.put(p + ".values", "is required");
            return;
        }
        if (values.size() > MAX_ARRAY_VALUES) {
            errors.put(p + ".values", "at most " + MAX_ARRAY_VALUES + " values are allowed");
            return;
        }
        for (int j = 0; j < values.size(); j++) {
            Object v = values.get(j);
            boolean ok = v instanceof Number
                    || v instanceof Boolean
                    || (v instanceof String s && s.length() <= 100);
            if (!ok) {
                errors.put(p + ".values[" + j + "]", "must be a number, a boolean or a string up to 100 characters");
                return;
            }
        }
    }

    private void checkPointer(String p, WorkspaceElement e, Map<String, WorkspaceElement> byId,
                              Map<String, String> errors) {
        checkPosition(p, e, errors);
        checkRequiredLength(p + ".name", e.name(), 30, errors);

        if (e.targetElementId() != null) {
            WorkspaceElement target = byId.get(e.targetElementId());
            if (target == null || !"ARRAY".equals(target.type())) {
                errors.put(p + ".targetElementId", "must reference an existing ARRAY element");
            } else {
                int size = target.values() == null ? 0 : target.values().size();
                if (e.index() == null || e.index() < 0 || e.index() >= size) {
                    errors.put(p + ".index", "must be a position inside the target array (0 to " + (size - 1) + ")");
                }
            }
        } else if (e.index() != null) {
            errors.put(p + ".index", "requires targetElementId");
        }
    }

    private void checkVariable(String p, WorkspaceElement e, Map<String, String> errors) {
        checkPosition(p, e, errors);
        checkRequiredLength(p + ".name", e.name(), 30, errors);
        checkRequiredLength(p + ".value", e.value(), 200, errors);
    }

    private void checkText(String p, WorkspaceElement e, Map<String, String> errors) {
        checkPosition(p, e, errors);
        if (e.text() == null) {
            errors.put(p + ".text", "is required");
        } else if (e.text().length() > 2000) {
            errors.put(p + ".text", "must be at most 2000 characters");
        }
    }

    private void checkArrow(String p, WorkspaceElement e, Map<String, WorkspaceElement> byId,
                            Map<String, String> errors) {
        checkOptionalLength(p + ".label", e.label(), 100, errors);

        WorkspaceElement from = e.fromElementId() == null ? null : byId.get(e.fromElementId());
        WorkspaceElement to = e.toElementId() == null ? null : byId.get(e.toElementId());

        if (from == null || "ARROW".equals(from.type())) {
            errors.put(p + ".fromElementId", "must reference an existing non-arrow element");
        }
        if (to == null || "ARROW".equals(to.type())) {
            errors.put(p + ".toElementId", "must reference an existing non-arrow element");
        }
        if (e.fromElementId() != null && e.fromElementId().equals(e.toElementId())) {
            errors.put(p + ".toElementId", "must differ from fromElementId");
        }
    }

    private void checkPosition(String p, WorkspaceElement e, Map<String, String> errors) {
        if (invalidCoordinate(e.x())) {
            errors.put(p + ".x", "is required and must be between -" + (long) MAX_COORDINATE + " and " + (long) MAX_COORDINATE);
        }
        if (invalidCoordinate(e.y())) {
            errors.put(p + ".y", "is required and must be between -" + (long) MAX_COORDINATE + " and " + (long) MAX_COORDINATE);
        }
    }

    private boolean invalidCoordinate(Double c) {
        return c == null || !Double.isFinite(c) || Math.abs(c) > MAX_COORDINATE;
    }

    private void checkRequiredLength(String field, String text, int max, Map<String, String> errors) {
        if (text == null || text.isBlank()) {
            errors.put(field, "is required");
        } else if (text.length() > max) {
            errors.put(field, "must be at most " + max + " characters");
        }
    }

    private void checkOptionalLength(String field, String text, int max, Map<String, String> errors) {
        if (text != null && text.length() > max) {
            errors.put(field, "must be at most " + max + " characters");
        }
    }

    private void fail(Map<String, String> errors) {
        if (!errors.isEmpty()) {
            throw new RequestValidationException("Invalid workspace", errors);
        }
    }
}
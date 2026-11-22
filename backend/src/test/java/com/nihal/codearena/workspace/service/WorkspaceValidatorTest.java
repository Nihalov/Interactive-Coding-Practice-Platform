package com.nihal.codearena.workspace.service;

import com.nihal.codearena.common.exception.RequestValidationException;
import com.nihal.codearena.workspace.dto.WorkspaceElement;
import com.nihal.codearena.workspace.dto.WorkspaceState;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

class WorkspaceValidatorTest {
    private final WorkspaceValidator validator = new WorkspaceValidator();

    @Test
    void acceptsBlankWorkspaceAndCompleteSceneWithForwardReferences() {
        assertDoesNotThrow(() -> validator.validate(new WorkspaceState(1, List.of())));
        // References deliberately precede their targets, as may happen after editing a saved scene.
        assertValid(arrow("link", "ptr", "arr", "checks"), pointer("ptr", "arr", 1),
                array("arr", List.of(2, "seven", true)), variable("var", "target", "9"), note("note", 0.0, 0.0, ""));
    }

    @ParameterizedTest
    @MethodSource("invalidEnvelopes")
    void rejectsUnsupportedSchemasAndMissingElementLists(WorkspaceState state, String field) {
        assertField(state, field);
    }

    static Stream<Arguments> invalidEnvelopes() {
        return Stream.of(Arguments.of(new WorkspaceState(null, List.of()), "state.schemaVersion"),
                Arguments.of(new WorkspaceState(2, List.of()), "state.schemaVersion"),
                Arguments.of(new WorkspaceState(1, null), "state.elements"));
    }

    @Test
    void enforcesElementLimitAtBoundary() {
        List<WorkspaceElement> allowed = IntStream.range(0, 500)
                .mapToObj(i -> note("note-" + i, 0.0, 0.0, "ok")).toList();
        assertDoesNotThrow(() -> validator.validate(new WorkspaceState(1, allowed)));
        List<WorkspaceElement> tooMany = IntStream.range(0, 501)
                .mapToObj(i -> note("note-" + i, 0.0, 0.0, "ok")).toList();
        assertField(new WorkspaceState(1, tooMany), "state.elements");
    }

    @Test
    void rejectsNullElementsDuplicateIdsInvalidIdsAndUnknownTypes() {
        assertField(new WorkspaceState(1, Collections.singletonList(null)), "elements[0]");
        assertInvalid("elements[1].id", array("same", List.of()), pointer("same", null, null));
        assertInvalid("elements[0].id", note("invalid id!", 0.0, 0.0, ""));
        assertInvalid("elements[0].id", note("a".repeat(65), 0.0, 0.0, ""));
        assertInvalid("elements[0].type", new WorkspaceElement("id", "UNKNOWN", 0.0, 0.0,
                null, null, null, null, null, null, null, null, null));
    }

    @ParameterizedTest
    @MethodSource("invalidCoordinates")
    void rejectsMissingOutOfBoundsAndNonFiniteCoordinates(Double coordinate) {
        assertInvalid("elements[0].x", note("note", coordinate, 0.0, ""));
        assertInvalid("elements[0].y", note("note", 0.0, coordinate, ""));
    }

    static Stream<Arguments> invalidCoordinates() {
        return Stream.of(Arguments.of((Double) null), Arguments.of(100_001.0), Arguments.of(-100_001.0),
                Arguments.of(Double.NaN), Arguments.of(Double.POSITIVE_INFINITY), Arguments.of(Double.NEGATIVE_INFINITY));
    }

    @Test
    void acceptsCoordinateBoundariesAndArrayValueBoundaries() {
        assertValid(note("note", -100_000.0, 100_000.0, "text"),
                array("arr", Collections.nCopies(100, "x".repeat(100))));
        assertValid(array("arr", List.of()));
    }

    @ParameterizedTest
    @MethodSource("invalidArrays")
    void rejectsArrayValuesThatCannotBeRepresentedByTheWorkspace(List<Object> values, String field) {
        assertInvalid(field, array("arr", values));
    }

    static Stream<Arguments> invalidArrays() {
        return Stream.of(Arguments.of(null, "elements[0].values"),
                Arguments.of(Collections.nCopies(101, 1), "elements[0].values"),
                Arguments.of(Arrays.asList(1, null), "elements[0].values[1]"),
                Arguments.of(List.of(List.of(1)), "elements[0].values[0]"),
                Arguments.of(List.of(Map.of("key", "value")), "elements[0].values[0]"),
                Arguments.of(List.of("x".repeat(101)), "elements[0].values[0]"));
    }

    @Test
    void acceptsBoundAndFreePointersButRejectsDanglingOrNonArrayTargets() {
        assertValid(array("arr", List.of(1)), pointer("bound", "arr", 0), pointer("free", null, null));
        assertInvalid("elements[0].targetElementId", pointer("ptr", "missing", 0));
        assertInvalid("elements[0].targetElementId", pointer("ptr", "note", 0), note("note", 0.0, 0.0, ""));
        assertInvalid("elements[0].index", pointer("ptr", null, 0));
    }

    @ParameterizedTest
    @MethodSource("invalidIndices")
    void rejectsMissingNegativeAndOutOfRangePointerIndices(Integer index) {
        assertInvalid("elements[0].index", pointer("ptr", "arr", index), array("arr", List.of(1, 2)));
    }

    static Stream<Arguments> invalidIndices() {
        return Stream.of(Arguments.of((Integer) null), Arguments.of(-1), Arguments.of(2));
    }

    @Test
    void emptyArraysCannotBePointerTargets() {
        assertInvalid("elements[0].index", pointer("ptr", "arr", 0), array("arr", List.of()));
    }

    @Test
    void rejectsMissingBlankAndOversizedVariableNamesAndValues() {
        for (String name : Arrays.asList(null, " ", "x".repeat(31))) {
            assertInvalid("elements[0].name", variable("var", name, "0"));
        }
        for (String value : Arrays.asList(null, " ", "x".repeat(201))) {
            assertInvalid("elements[0].value", variable("var", "x", value));
        }
        assertValid(variable("var", "n".repeat(30), "v".repeat(200)));
    }

    @Test
    void noteTextMayBeEmptyButMustBePresentAndWithinLengthLimit() {
        assertValid(note("note", 0.0, 0.0, ""), note("long", 0.0, 0.0, "x".repeat(2000)));
        assertInvalid("elements[0].text", note("note", 0.0, 0.0, null));
        assertInvalid("elements[0].text", note("note", 0.0, 0.0, "x".repeat(2001)));
    }

    @Test
    void arrowsRequireDistinctExistingNonArrowEndpoints() {
        WorkspaceElement arr = array("arr", List.of(1));
        WorkspaceElement note = note("note", 0.0, 0.0, "");
        WorkspaceElement link = arrow("link", "arr", "note", null);
        assertValid(arr, note, link);
        assertInvalid("elements[0].fromElementId", arrow("link", "missing", "note", ""), note);
        assertInvalid("elements[0].toElementId", arrow("link", "arr", "missing", ""), arr);
        assertInvalid("elements[0].toElementId", arrow("link", "arr", "arr", ""), arr);
        assertInvalid("elements[0].fromElementId", arrow("other", "link", "note", ""), arr, note, link);
        assertInvalid("elements[0].toElementId", arrow("other", "arr", "link", ""), arr, note, link);
        assertInvalid("elements[0].label", arrow("link", "arr", "note", "x".repeat(101)), arr, note);
    }

    private void assertValid(WorkspaceElement... elements) {
        assertDoesNotThrow(() -> validator.validate(new WorkspaceState(1, List.of(elements))));
    }

    private void assertInvalid(String field, WorkspaceElement... elements) {
        assertField(new WorkspaceState(1, List.of(elements)), field);
    }

    private void assertField(WorkspaceState state, String field) {
        RequestValidationException error = assertThrows(RequestValidationException.class, () -> validator.validate(state));
        assertTrue(error.getFieldErrors().containsKey(field), () -> "Missing field " + field + ": " + error.getFieldErrors());
    }

    private static WorkspaceElement array(String id, List<Object> values) {
        return new WorkspaceElement(id, "ARRAY", 140.0, 140.0, "arr", values, null, null, null, null, null, null, null);
    }

    private static WorkspaceElement pointer(String id, String target, Integer index) {
        return new WorkspaceElement(id, "POINTER", 140.0, 90.0, "i", null, null, null, target, index, null, null, null);
    }

    private static WorkspaceElement variable(String id, String name, String value) {
        return new WorkspaceElement(id, "VARIABLE", 300.0, 140.0, name, null, value, null, null, null, null, null, null);
    }

    private static WorkspaceElement note(String id, Double x, Double y, String text) {
        return new WorkspaceElement(id, "TEXT", x, y, null, null, null, text, null, null, null, null, null);
    }

    private static WorkspaceElement arrow(String id, String from, String to, String label) {
        return new WorkspaceElement(id, "ARROW", null, null, null, null, null, null, null, null, from, to, label);
    }
}

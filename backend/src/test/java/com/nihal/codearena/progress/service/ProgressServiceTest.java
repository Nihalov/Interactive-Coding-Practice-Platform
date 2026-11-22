package com.nihal.codearena.progress.service;

import com.nihal.codearena.common.exception.ResourceNotFoundException;
import com.nihal.codearena.problem.entity.Difficulty;
import com.nihal.codearena.problem.entity.Problem;
import com.nihal.codearena.problem.repository.ProblemRepository;
import com.nihal.codearena.progress.entity.UserProblemProgress;
import com.nihal.codearena.progress.repository.UserProblemProgressRepository;
import com.nihal.codearena.submission.entity.SubmissionStatus;
import com.nihal.codearena.submission.repository.SubmissionRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ProgressServiceTest {
    private final UserProblemProgressRepository progress = mock(UserProblemProgressRepository.class);
    private final ProblemRepository problems = mock(ProblemRepository.class);
    private final ProgressService service = new ProgressService(progress, problems, mock(SubmissionRepository.class));
    private final Problem problem = Problem.builder().id(3L).title("A Plus B").slug("a-plus-b").difficulty(Difficulty.EASY).build();

    @Test
    void openingProblemCreatesZeroAttemptProgressWithAStartTime() {
        when(problems.findBySlug("a-plus-b")).thenReturn(Optional.of(problem));

        service.start(7L, "a-plus-b");

        verify(progress).insertIfAbsent(eq(7L), eq(3L), any(LocalDateTime.class));
        verifyNoMoreInteractions(progress);
    }

    @Test
    void unknownProblemDoesNotCreateProgress() {
        when(problems.findBySlug("missing")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.start(7L, "missing"));

        verifyNoInteractions(progress);
    }

    @Test
    void reopeningUsesInsertOnlyAndDoesNotResetExistingProgress() {
        when(problems.findBySlug("a-plus-b")).thenReturn(Optional.of(problem));
        when(progress.insertIfAbsent(eq(7L), eq(3L), any())).thenReturn(0);

        service.start(7L, "a-plus-b");
        service.start(7L, "a-plus-b");

        verify(progress, times(2)).insertIfAbsent(eq(7L), eq(3L), any(LocalDateTime.class));
        verifyNoMoreInteractions(progress);
    }

    @Test
    void judgingStartedProblemCountsOnlySubmissionsAndKeepsAcceptedResultWhenRetried() {
        var started = LocalDateTime.of(2026, 11, 22, 12, 0);
        var acceptedAt = started.plusMinutes(5);
        var row = UserProblemProgress.builder().problem(problem).attempts(0).solved(false).lastAttemptAt(started).build();
        when(progress.findForUpdate(7L, 3L)).thenReturn(Optional.of(row));

        service.record(7L, 3L, 9L, SubmissionStatus.ACCEPTED, 12L, acceptedAt);
        assertEquals(1, row.getAttempts());
        assertTrue(row.isSolved());
        assertEquals(acceptedAt, row.getFirstSolvedAt());
        assertEquals(12L, row.getBestTimeMs());

        service.record(7L, 3L, 10L, SubmissionStatus.WRONG_ANSWER, 8L, acceptedAt.plusMinutes(1));
        assertEquals(2, row.getAttempts());
        assertTrue(row.isSolved());
        assertEquals(9L, row.getBestSubmissionId());
        assertEquals(12L, row.getBestTimeMs());
        assertEquals(acceptedAt, row.getFirstSolvedAt());
        assertEquals(acceptedAt.plusMinutes(1), row.getLastAttemptAt());
    }
}

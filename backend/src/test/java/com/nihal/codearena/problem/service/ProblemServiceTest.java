package com.nihal.codearena.problem.service;

import com.nihal.codearena.problem.cache.ProblemCache;
import com.nihal.codearena.problem.dto.ProblemPageSnapshot;
import com.nihal.codearena.problem.entity.Difficulty;
import com.nihal.codearena.problem.entity.Problem;
import com.nihal.codearena.problem.repository.ProblemRepository;
import com.nihal.codearena.submission.repository.SubmissionRepository;
import com.nihal.codearena.testcase.repository.TestCaseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ProblemServiceTest {
    private final ProblemRepository repository = mock(ProblemRepository.class);
    private final ProblemCache cache = mock(ProblemCache.class);
    private final ProblemService service = new ProblemService(repository, mock(TestCaseRepository.class),
            mock(SubmissionRepository.class), cache);
    private final Map<String, ProblemPageSnapshot> entries = new HashMap<>();

    @BeforeEach
    void cacheLoaders() {
        when(cache.list(anyString(), any())).thenAnswer(call -> {
            Supplier<ProblemPageSnapshot> loader = call.getArgument(1);
            return entries.computeIfAbsent(call.getArgument(0), key -> loader.get());
        });
    }

    @Test
    void searchesFullRepositoryWithDifficultySortAndPagination() {
        var pageable = PageRequest.of(1, 10, Sort.by("title"));
        var problem = Problem.builder().id(20L).title("Two Sum").slug("two-sum").difficulty(Difficulty.EASY).build();
        when(repository.search("SUM", Difficulty.EASY, pageable))
                .thenReturn(new PageImpl<>(List.of(problem), pageable, 21));

        var result = service.list(Difficulty.EASY, "  SUM  ", pageable);

        assertEquals(21, result.totalElements());
        assertEquals(1, result.page());
        assertEquals("Two Sum", result.content().getFirst().title());
        verify(repository).search("SUM", Difficulty.EASY, pageable);
        verify(repository, never()).findAll(any(PageRequest.class));
    }

    @Test
    void searchCachesDoNotLeakIntoOtherQueriesOrTheUnfilteredLibrary() {
        var pageable = PageRequest.of(0, 10);
        when(repository.search(anyString(), isNull(), eq(pageable))).thenReturn(new PageImpl<>(List.of()));
        when(repository.findAll(pageable)).thenReturn(new PageImpl<>(List.of()));

        service.list(null, "sum", pageable);
        service.list(null, "sum", pageable);
        service.list(null, "array", pageable);
        service.list(null, null, pageable);

        assertEquals(3, entries.size());
        verify(repository, times(1)).search("sum", null, pageable);
        verify(repository, times(1)).search("array", null, pageable);
        verify(repository, times(1)).findAll(pageable);
    }

    @Test
    void whitespaceSearchKeepsExistingDifficultyFilter() {
        var pageable = PageRequest.of(0, 10);
        when(repository.findByDifficulty(Difficulty.HARD, pageable)).thenReturn(new PageImpl<>(List.of()));

        service.list(Difficulty.HARD, " \t ", pageable);

        verify(repository).findByDifficulty(Difficulty.HARD, pageable);
        verify(repository, never()).search(anyString(), any(), any());
    }
}

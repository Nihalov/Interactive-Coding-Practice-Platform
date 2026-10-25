package com.nihal.codearena.testcase.repository;

import com.nihal.codearena.testcase.entity.TestCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TestCaseRepository extends JpaRepository<TestCase, Long> {

    List<TestCase> findByProblemIdOrderByOrderIndexAscIdAsc(Long problemId);

    List<TestCase> findByProblemIdAndSampleTrueOrderByOrderIndexAscIdAsc(Long problemId);

    Optional<TestCase> findByIdAndProblemId(Long id, Long problemId);

    void deleteByProblemId(Long problemId);

    long countByProblemId(Long problemId);

    @Query("select coalesce(max(t.orderIndex), 0) from TestCase t where t.problem.id = :problemId")
    int findMaxOrderIndex(@Param("problemId") Long problemId);
}
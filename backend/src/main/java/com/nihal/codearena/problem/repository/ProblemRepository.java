package com.nihal.codearena.problem.repository;

import com.nihal.codearena.problem.entity.Difficulty;
import com.nihal.codearena.problem.entity.Problem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProblemRepository extends JpaRepository<Problem, Long> {

    Optional<Problem> findBySlug(String slug);

    boolean existsBySlug(String slug);

    boolean existsByTitleAndIdNot(String title, Long id);

    Page<Problem> findByDifficulty(Difficulty difficulty, Pageable pageable);
}
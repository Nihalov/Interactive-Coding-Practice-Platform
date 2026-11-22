package com.nihal.codearena.problem.repository;

import com.nihal.codearena.problem.entity.Difficulty;
import com.nihal.codearena.problem.entity.Problem;
import com.nihal.codearena.progress.dto.DifficultyCount;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProblemRepository extends JpaRepository<Problem, Long> {

    Optional<Problem> findBySlug(String slug);

    boolean existsBySlug(String slug);

    boolean existsByTitleAndIdNot(String title, Long id);

    Page<Problem> findByDifficulty(Difficulty difficulty, Pageable pageable);

    @Query("""
            select p from Problem p
            where (:difficulty is null or p.difficulty = :difficulty)
              and (locate(lower(:query), lower(p.title)) > 0
                   or locate(lower(:query), lower(p.slug)) > 0)
            """)
    Page<Problem> search(@Param("query") String query, @Param("difficulty") Difficulty difficulty, Pageable pageable);

    @Query("select new com.nihal.codearena.progress.dto.DifficultyCount(p.difficulty, count(p)) from Problem p group by p.difficulty")
    List<DifficultyCount> countGroupedByDifficulty();
}

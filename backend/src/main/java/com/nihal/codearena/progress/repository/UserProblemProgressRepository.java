package com.nihal.codearena.progress.repository;

import com.nihal.codearena.progress.dto.DifficultyCount;
import com.nihal.codearena.progress.entity.UserProblemProgress;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserProblemProgressRepository extends JpaRepository<UserProblemProgress, Long> {

    /** Creates the row if it does not exist; the unique constraint decides, not an if-check. */
    @Modifying
    @Query(value = """
            insert into user_problem_progress (user_id, problem_id, solved, attempts)
            values (:userId, :problemId, false, 0)
            on conflict (user_id, problem_id) do nothing
            """, nativeQuery = true)
    int insertIfAbsent(@Param("userId") Long userId, @Param("problemId") Long problemId);

    /** SELECT ... FOR UPDATE: concurrent finalizers for the same user and problem take turns. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from UserProblemProgress p where p.user.id = :userId and p.problem.id = :problemId")
    Optional<UserProblemProgress> findForUpdate(@Param("userId") Long userId, @Param("problemId") Long problemId);

    @EntityGraph(attributePaths = "problem")
    Page<UserProblemProgress> findByUserId(Long userId, Pageable pageable);

    long countByUserId(Long userId);

    long countByUserIdAndSolvedTrue(Long userId);

    @Query("select coalesce(sum(p.attempts), 0) from UserProblemProgress p where p.user.id = :userId")
    long sumAttempts(@Param("userId") Long userId);

    @Query("""
            select new com.nihal.codearena.progress.dto.DifficultyCount(p.problem.difficulty, count(p))
            from UserProblemProgress p
            where p.user.id = :userId and p.solved = true
            group by p.problem.difficulty
            """)
    List<DifficultyCount> countSolvedByDifficulty(@Param("userId") Long userId);
}
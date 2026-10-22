package com.nihal.codearena.submission.repository;

import com.nihal.codearena.submission.entity.SubmissionTestResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SubmissionTestResultRepository extends JpaRepository<SubmissionTestResult, Long> {

    List<SubmissionTestResult> findBySubmissionIdOrderByOrderIndexAsc(Long submissionId);
}
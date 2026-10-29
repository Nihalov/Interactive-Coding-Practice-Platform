package com.nihal.codearena.workspace.repository;

import com.nihal.codearena.workspace.entity.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WorkspaceRepository extends JpaRepository<Workspace, Long> {

    Optional<Workspace> findByUserIdAndProblemId(Long userId, Long problemId);
}
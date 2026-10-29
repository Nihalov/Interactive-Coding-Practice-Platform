package com.nihal.codearena.workspace.service;

import com.nihal.codearena.auth.repository.UserRepository;
import com.nihal.codearena.common.exception.ConflictException;
import com.nihal.codearena.common.exception.RequestValidationException;
import com.nihal.codearena.common.exception.ResourceNotFoundException;
import com.nihal.codearena.problem.entity.Problem;
import com.nihal.codearena.problem.repository.ProblemRepository;
import com.nihal.codearena.workspace.dto.SaveWorkspaceRequest;
import com.nihal.codearena.workspace.dto.WorkspaceResponse;
import com.nihal.codearena.workspace.dto.WorkspaceState;
import com.nihal.codearena.workspace.entity.Workspace;
import com.nihal.codearena.workspace.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class WorkspaceService {

    private static final int MAX_JSON_CHARS = 200_000;
    private static final String STALE_MESSAGE =
            "The workspace was changed elsewhere. Reload it and apply your changes again.";

    private final WorkspaceRepository workspaceRepository;
    private final ProblemRepository problemRepository;
    private final UserRepository userRepository;
    private final WorkspaceValidator validator;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public WorkspaceResponse get(Long userId, String slug) {
        Problem problem = findProblem(slug);
        return workspaceRepository.findByUserIdAndProblemId(userId, problem.getId())
                .map(this::toResponse)
                .orElseGet(() -> new WorkspaceResponse(null, null,
                        new WorkspaceState(WorkspaceValidator.SCHEMA_VERSION, List.of())));
    }

    @Transactional
    public WorkspaceResponse save(Long userId, String slug, SaveWorkspaceRequest request) {
        Problem problem = findProblem(slug);

        validator.validate(request.state());
        String json = serialize(request.state());
        if (json.length() > MAX_JSON_CHARS) {
            throw new RequestValidationException("Workspace is too large",
                    Map.of("state", "must be smaller than " + (MAX_JSON_CHARS / 1000) + " KB"));
        }

        Optional<Workspace> existing = workspaceRepository.findByUserIdAndProblemId(userId, problem.getId());

        try {
            if (existing.isEmpty()) {
                // Creating: the client must say "I believe none exists" with version null
                if (request.version() != null) {
                    throw new ConflictException(STALE_MESSAGE);
                }
                Workspace created = Workspace.builder()
                        .user(userRepository.getReferenceById(userId))
                        .problem(problem)
                        .stateJson(json)
                        .build();
                return toResponse(workspaceRepository.saveAndFlush(created));
            }

            Workspace workspace = existing.get();
            // Friendly check first; the @Version column is the real guard against a race
            if (!workspace.getVersion().equals(request.version())) {
                throw new ConflictException(STALE_MESSAGE);
            }
            workspace.setStateJson(json);
            return toResponse(workspaceRepository.saveAndFlush(workspace));

        } catch (ObjectOptimisticLockingFailureException | DataIntegrityViolationException e) {
            // Two saves raced: the loser lands here
            throw new ConflictException(STALE_MESSAGE);
        }
    }

    private Problem findProblem(String slug) {
        return problemRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Problem not found"));
    }

    private String serialize(WorkspaceState state) {
        try {
            return objectMapper.writeValueAsString(state);
        } catch (RuntimeException e) {
            throw new IllegalStateException("Could not serialize workspace", e);
        }
    }

    private WorkspaceResponse toResponse(Workspace w) {
        try {
            WorkspaceState state = objectMapper.readValue(w.getStateJson(), WorkspaceState.class);
            return new WorkspaceResponse(w.getVersion(), w.getUpdatedAt(), state);
        } catch (RuntimeException e) {
            throw new IllegalStateException("Stored workspace " + w.getId() + " could not be read", e);
        }
    }
}
package com.nihal.codearena.workspace.entity;

import com.nihal.codearena.auth.entity.User;
import com.nihal.codearena.problem.entity.Problem;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.ColumnTransformer;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "workspaces",
        uniqueConstraints = @UniqueConstraint(name = "uk_workspace_user_problem",
                columnNames = {"user_id", "problem_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Workspace {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "problem_id", nullable = false)
    private Problem problem;

    @Column(name = "state_json", nullable = false, columnDefinition = "jsonb")
    @ColumnTransformer(read = "cast(state_json as text)", write = "cast(? as jsonb)")
    private String stateJson;

    // Optimistic lock: Hibernate increments it on every update and rejects stale writes
    @Version
    private Long version;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
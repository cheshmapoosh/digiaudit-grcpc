package com.digiaudit.grcpc.modules.masterdata.accountgroup.domain.entity;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import com.digiaudit.grcpc.modules.masterdata.accountgroup.domain.converter.AccountGroupObjectiveListConverter;
import com.digiaudit.grcpc.modules.masterdata.accountgroup.domain.converter.AccountGroupRiskListConverter;
import com.digiaudit.grcpc.modules.masterdata.accountgroup.domain.converter.AccountRangeListConverter;
import com.digiaudit.grcpc.modules.masterdata.accountgroup.domain.value.*;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "account_group",
        indexes = {
                @Index(name = "idx_account_group_parent_id", columnList = "parent_id"),
                @Index(name = "idx_account_group_status", columnList = "status")
        },
        uniqueConstraints = @UniqueConstraint(name = "uk_account_group_code", columnNames = "code")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder(toBuilder = true)
public class AccountGroupEntity extends AuditableEntity {
    @Id
    @GeneratedValue
    private UUID id;
    @Column(name = "code", nullable = false, length = 50)
    private String code;
    @Column(name = "title", nullable = false, length = 255)
    private String title;
    @Column(name = "parent_id")
    private UUID parentId;
    @Column(name = "status", nullable = false, length = 50)
    private String status;
    @Column(name = "sort_order")
    private Integer sortOrder;
    @Column(name = "description", length = 2000)
    private String description;
    @Column(name = "importance", length = 50)
    private String importance;
    @Column(name = "reasonable_assurance")
    private Boolean reasonableAssurance;
    @Column(name = "effective_date")
    private LocalDate effectiveDate;
    @Column(name = "documents_count", nullable = false)
    private Integer documentsCount;
    @Column(name = "assertion_existence")
    private Boolean assertionExistence;
    @Column(name = "assertion_completeness")
    private Boolean assertionCompleteness;
    @Column(name = "assertion_valuation")
    private Boolean assertionValuation;
    @Column(name = "assertion_disclosure")
    private Boolean assertionDisclosure;
    @Convert(converter = AccountGroupObjectiveListConverter.class)
    @Column(name = "objectives_json", columnDefinition = "clob")
    private List<AccountGroupObjectiveValue> objectives;
    @Convert(converter = AccountRangeListConverter.class)
    @Column(name = "account_ranges_json", columnDefinition = "clob")
    private List<AccountRangeValue> accountRanges;
    @Convert(converter = AccountGroupRiskListConverter.class)
    @Column(name = "risks_json", columnDefinition = "clob")
    private List<AccountGroupRiskValue> risks;

    public AccountGroupAssertionsValue getAssertions() {
        return new AccountGroupAssertionsValue(assertionExistence, assertionCompleteness, assertionValuation, assertionDisclosure);
    }

    public void setAssertions(AccountGroupAssertionsValue assertions) {
        this.assertionExistence = assertions == null ? null : assertions.existence();
        this.assertionCompleteness = assertions == null ? null : assertions.completeness();
        this.assertionValuation = assertions == null ? null : assertions.valuation();
        this.assertionDisclosure = assertions == null ? null : assertions.disclosure();
    }
}

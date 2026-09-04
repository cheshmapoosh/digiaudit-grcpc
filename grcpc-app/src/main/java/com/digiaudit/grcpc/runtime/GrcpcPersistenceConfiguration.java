package com.digiaudit.grcpc.runtime;

import com.digiaudit.grcpc.common.persistence.AuditableEntity;
import com.digiaudit.grcpc.common.persistence.BooleanNumberConverter;
import com.digiaudit.grcpc.modules.audit.domain.entity.AuditLogEntity;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentEntity;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentLifecycleStatusConverter;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentLinkEntity;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentLinkTargetTypeConverter;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentTempUploadEntity;
import com.digiaudit.grcpc.modules.document.infrastructure.persistence.DocumentVersionEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.domain.entity.CentralAccountGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.converter.CentralControlRelevanceConverter;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.entity.CentralControlObjectiveEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicyEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicyGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicyVersionEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.CentralRegulationEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.CentralRegulationGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.CentralRegulationRequirementEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.entity.CentralRiskCategoryEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.entity.CentralRiskTemplateEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.shared.domain.entity.CentralDefinitionEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralProcessEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralSubprocessEntity;
import com.digiaudit.grcpc.modules.masterdata.revision.infrastructure.persistence.JsonNodeClobConverter;
import com.digiaudit.grcpc.modules.masterdata.revision.infrastructure.persistence.MasterDataRevisionContentEntity;
import com.digiaudit.grcpc.modules.masterdata.revision.infrastructure.persistence.MasterDataRevisionEntity;
import com.digiaudit.grcpc.modules.masterdata.revision.infrastructure.persistence.RevisionEntityTypeConverter;
import com.digiaudit.grcpc.modules.masterdata.scope.control.domain.entity.CentralSubprocessControlScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.domain.entity.CentralSubprocessRiskScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.infrastructure.persistence.MasterDataHierarchyGuardEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.infrastructure.persistence.MasterDataLifecycleStatusConverter;
import com.digiaudit.grcpc.modules.organization.domain.entity.OrganizationEntity;
import com.digiaudit.grcpc.modules.organization.infrastructure.persistence.OrganizationTypeConverter;
import com.digiaudit.grcpc.modules.securityacl.domain.entity.ResourceAclEntryEntity;
import com.digiaudit.grcpc.modules.setup.domain.entity.SystemSetupEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.AppUserEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.BusinessPermissionEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.BusinessPermissionI18nEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.DelegationAssignableRoleEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.DelegationPolicyEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.PermissionEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.PermissionI18nEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.RoleBusinessPermissionEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.RoleEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.RoleI18nEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.RolePermissionEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.UserRoleAssignmentEntity;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.orm.jpa.persistenceunit.PersistenceManagedTypes;

@Configuration(proxyBeanMethods = false)
public class GrcpcPersistenceConfiguration {

    @Bean
    PersistenceManagedTypes persistenceManagedTypes() {
        return PersistenceManagedTypes.of(
                AuditableEntity.class.getName(),
                BooleanNumberConverter.class.getName(),
                AuditLogEntity.class.getName(),
                DocumentEntity.class.getName(),
                DocumentLifecycleStatusConverter.class.getName(),
                DocumentLinkEntity.class.getName(),
                DocumentLinkTargetTypeConverter.class.getName(),
                DocumentTempUploadEntity.class.getName(),
                DocumentVersionEntity.class.getName(),
                CentralDefinitionEntity.class.getName(),
                CentralControlEntity.class.getName(),
                CentralControlGroupEntity.class.getName(),
                CentralControlRelevanceConverter.class.getName(),
                CentralControlObjectiveEntity.class.getName(),
                CentralRiskCategoryEntity.class.getName(),
                CentralRiskTemplateEntity.class.getName(),
                CentralAccountGroupEntity.class.getName(),
                CentralRegulationGroupEntity.class.getName(),
                CentralRegulationEntity.class.getName(),
                CentralRegulationRequirementEntity.class.getName(),
                CentralPolicyGroupEntity.class.getName(),
                CentralPolicyEntity.class.getName(),
                CentralPolicyVersionEntity.class.getName(),
                CentralProcessEntity.class.getName(),
                CentralSubprocessEntity.class.getName(),
                CentralSubprocessControlScopeEntity.class.getName(),
                CentralSubprocessRiskScopeEntity.class.getName(),
                JsonNodeClobConverter.class.getName(),
                MasterDataRevisionContentEntity.class.getName(),
                MasterDataRevisionEntity.class.getName(),
                RevisionEntityTypeConverter.class.getName(),
                MasterDataHierarchyGuardEntity.class.getName(),
                MasterDataLifecycleStatusConverter.class.getName(),
                OrganizationEntity.class.getName(),
                OrganizationTypeConverter.class.getName(),
                ResourceAclEntryEntity.class.getName(),
                SystemSetupEntity.class.getName(),
                AppUserEntity.class.getName(),
                BusinessPermissionEntity.class.getName(),
                BusinessPermissionI18nEntity.class.getName(),
                DelegationAssignableRoleEntity.class.getName(),
                DelegationPolicyEntity.class.getName(),
                PermissionEntity.class.getName(),
                PermissionI18nEntity.class.getName(),
                RoleBusinessPermissionEntity.class.getName(),
                RoleEntity.class.getName(),
                RoleI18nEntity.class.getName(),
                RolePermissionEntity.class.getName(),
                UserRoleAssignmentEntity.class.getName()
        );
    }
}

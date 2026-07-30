package com.digiaudit.grcpc.modules.masterdata.revision.application;

import java.util.UUID;

public interface MasterDataRevisionActorProvider {
    UUID currentActorId();
}

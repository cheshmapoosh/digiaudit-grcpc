package com.digiaudit.grcpc.modules.masterdata.local.application;

import com.digiaudit.grcpc.common.exception.BusinessException;

public final class LocalCommandBadRequestException extends BusinessException {
  public LocalCommandBadRequestException(String message) {
    super("LOCAL_COMMAND_INVALID", "error.masterdata.local.commandInvalid", message);
  }
}

package com.digiaudit.grcpc.modules.masterdata.shared.domain;

import com.digiaudit.grcpc.modules.masterdata.shared.exception.MasterDataDateRangeInvalidException;

import java.time.LocalDate;
import java.util.Objects;

public record ValidityPeriod(LocalDate validFrom, LocalDate validTo) {
    public ValidityPeriod {
        if (validFrom != null && validTo != null && validTo.isBefore(validFrom)) {
            throw new MasterDataDateRangeInvalidException(validFrom, validTo);
        }
    }

    public static ValidityPeriod of(LocalDate validFrom, LocalDate validTo) {
        return new ValidityPeriod(validFrom, validTo);
    }

    public static ValidityPeriod unbounded() {
        return new ValidityPeriod(null, null);
    }

    public boolean contains(LocalDate evaluationDate) {
        Objects.requireNonNull(evaluationDate, "evaluationDate is required");
        return startsOnOrBefore(evaluationDate) && endsOnOrAfter(evaluationDate);
    }

    public boolean isSubsetOf(ValidityPeriod centralPeriod) {
        Objects.requireNonNull(centralPeriod, "centralPeriod is required");
        return lowerBoundIsWithin(centralPeriod) && upperBoundIsWithin(centralPeriod);
    }

    public boolean overlaps(ValidityPeriod other) {
        Objects.requireNonNull(other, "other is required");
        return lowerBoundAllowsOverlap(other) && other.lowerBoundAllowsOverlap(this);
    }

    public boolean isUnbounded() {
        return validFrom == null && validTo == null;
    }

    public boolean startsOnOrBefore(LocalDate date) {
        Objects.requireNonNull(date, "date is required");
        return validFrom == null || !validFrom.isAfter(date);
    }

    public boolean endsOnOrAfter(LocalDate date) {
        Objects.requireNonNull(date, "date is required");
        return validTo == null || !validTo.isBefore(date);
    }

    private boolean lowerBoundIsWithin(ValidityPeriod centralPeriod) {
        if (centralPeriod.validFrom == null) {
            return true;
        }
        return validFrom != null && !validFrom.isBefore(centralPeriod.validFrom);
    }

    private boolean upperBoundIsWithin(ValidityPeriod centralPeriod) {
        if (centralPeriod.validTo == null) {
            return true;
        }
        return validTo != null && !validTo.isAfter(centralPeriod.validTo);
    }

    private boolean lowerBoundAllowsOverlap(ValidityPeriod other) {
        return validFrom == null || other.validTo == null || !validFrom.isAfter(other.validTo);
    }
}

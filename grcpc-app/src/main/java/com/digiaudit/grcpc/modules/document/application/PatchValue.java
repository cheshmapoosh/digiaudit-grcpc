package com.digiaudit.grcpc.modules.document.application;

public final class PatchValue<T> {
    private static final PatchValue<?> ABSENT = new PatchValue<>(false, null);

    private final boolean present;
    private final T value;

    private PatchValue(boolean present, T value) {
        this.present = present;
        this.value = value;
    }

    @SuppressWarnings("unchecked")
    public static <T> PatchValue<T> absent() {
        return (PatchValue<T>) ABSENT;
    }

    public static <T> PatchValue<T> present(T value) {
        return new PatchValue<>(true, value);
    }

    public boolean isPresent() {
        return present;
    }

    public T value() {
        return value;
    }
}

package com.digiaudit.grcpc.modules.document.application;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

@Component
public class DocumentChecksumService {
    public static final String SHA_256 = "SHA-256";

    public String sha256(MultipartFile file) {
        try {
            MessageDigest digest = MessageDigest.getInstance(SHA_256);
            byte[] buffer = new byte[8192];
            try (InputStream raw = file.getInputStream();
                 DigestInputStream input = new DigestInputStream(raw, digest)) {
                while (input.read(buffer) != -1) {
                    // DigestInputStream updates the digest as the stream is read.
                }
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (IOException ex) {
            throw DocumentFailures.conflict("DOCUMENT_STORAGE_UNAVAILABLE", "Document upload stream could not be read");
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }
}

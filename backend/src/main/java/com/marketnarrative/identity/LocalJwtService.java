package com.marketnarrative.identity;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class LocalJwtService {

    private static final Base64.Encoder URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder URL_DECODER = Base64.getUrlDecoder();
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };

    private final ObjectMapper objectMapper;
    private final String jwtSecret;
    private final String issuer;

    public LocalJwtService(
        ObjectMapper objectMapper,
        @Value("${app.security.jwt-secret}") String jwtSecret,
        @Value("${app.security.issuer}") String issuer
    ) {
        this.objectMapper = objectMapper;
        this.jwtSecret = jwtSecret;
        this.issuer = issuer;
    }

    public String issue(UserAccount user) {
        List<String> permissions = user.getRole() == UserRole.ADMIN
            ? List.of("admin:read", "admin:write")
            : List.of("public:read");
        if (user.getRole() == UserRole.ADMIN) {
            permissions = List.of(
                "admin:read",
                "admin:write",
                "create:script",
                "edit:script",
                "generate:assets",
                "publish:digest"
            );
        }

        Map<String, Object> header = Map.of("alg", "HS256", "typ", "JWT");
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("iss", issuer);
        payload.put("sub", user.getEmail());
        payload.put("name", user.getDisplayName());
        payload.put("role", user.getRole().name());
        payload.put("permissions", permissions);
        payload.put("iat", Instant.now().getEpochSecond());
        payload.put("exp", Instant.now().plusSeconds(8 * 60 * 60).getEpochSecond());

        String unsigned = base64Json(header) + "." + base64Json(payload);
        return unsigned + "." + sign(unsigned);
    }

    public Optional<AuthenticatedUser> parse(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                return Optional.empty();
            }
            String unsigned = parts[0] + "." + parts[1];
            if (!constantTimeEquals(sign(unsigned), parts[2])) {
                return Optional.empty();
            }
            Map<String, Object> payload = objectMapper.readValue(URL_DECODER.decode(parts[1]), MAP_TYPE);
            if (!issuer.equals(payload.get("iss"))) {
                return Optional.empty();
            }
            Number exp = (Number) payload.get("exp");
            if (exp == null || exp.longValue() < Instant.now().getEpochSecond()) {
                return Optional.empty();
            }
            String email = (String) payload.get("sub");
            String displayName = (String) payload.get("name");
            UserRole role = UserRole.valueOf((String) payload.get("role"));
            @SuppressWarnings("unchecked")
            List<String> permissions = (List<String>) payload.get("permissions");
            return Optional.of(new AuthenticatedUser(email, displayName, role, permissions));
        } catch (RuntimeException | java.io.IOException ex) {
            return Optional.empty();
        }
    }

    private String base64Json(Map<String, Object> value) {
        try {
            return URL_ENCODER.encodeToString(objectMapper.writeValueAsBytes(value));
        } catch (java.io.IOException ex) {
            throw new IllegalStateException("Unable to encode JWT JSON", ex);
        }
    }

    private String sign(String unsigned) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return URL_ENCODER.encodeToString(mac.doFinal(unsigned.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to sign local JWT", ex);
        }
    }

    private boolean constantTimeEquals(String expected, String actual) {
        byte[] expectedBytes = expected.getBytes(StandardCharsets.UTF_8);
        byte[] actualBytes = actual.getBytes(StandardCharsets.UTF_8);
        if (expectedBytes.length != actualBytes.length) {
            return false;
        }
        int result = 0;
        for (int i = 0; i < expectedBytes.length; i++) {
            result |= expectedBytes[i] ^ actualBytes[i];
        }
        return result == 0;
    }
}

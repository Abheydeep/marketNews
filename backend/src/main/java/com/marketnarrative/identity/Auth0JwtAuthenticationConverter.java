package com.marketnarrative.identity;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

public class Auth0JwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private static final String PERMISSIONS_CLAIM = "permissions";

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        Collection<GrantedAuthority> authorities = permissions(jwt).stream()
            .map(SimpleGrantedAuthority::new)
            .map(GrantedAuthority.class::cast)
            .toList();
        return new JwtAuthenticationToken(jwt, authorities, principalName(jwt));
    }

    private List<String> permissions(Jwt jwt) {
        Object claim = jwt.getClaims().get(PERMISSIONS_CLAIM);
        if (claim instanceof Collection<?> values) {
            return values.stream()
                .flatMap(value -> value instanceof String permission ? Stream.of(permission) : Stream.empty())
                .toList();
        }
        return List.of();
    }

    private String principalName(Jwt jwt) {
        Map<String, Object> claims = jwt.getClaims();
        Object email = claims.get("email");
        return email instanceof String value ? value : jwt.getSubject();
    }
}

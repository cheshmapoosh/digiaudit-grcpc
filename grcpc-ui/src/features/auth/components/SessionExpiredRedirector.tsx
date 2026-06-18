import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuthState } from "@/features/auth";
import {
    buildReturnUrlFromLocation,
    parseReturnUrlToLocation,
} from "@/features/auth/utils/returnUrl";
import { registerUnauthorizedSessionHandler } from "@/shared/infra/unauthorizedSession";

export default function SessionExpiredRedirector() {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        return registerUnauthorizedSessionHandler(() => {
            const authState = useAuthState.getState();

            if (authState.me?.authenticated !== true) {
                return false;
            }

            const returnUrl = buildReturnUrlFromLocation(location);
            authState.handleSessionExpired();

            navigate("/login", {
                replace: true,
                state: {
                    from: parseReturnUrlToLocation(returnUrl),
                    sessionExpired: true,
                },
            });

            return true;
        });
    }, [location, navigate]);

    return null;
}

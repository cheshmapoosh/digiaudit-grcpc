import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(
    readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
) as {
    version?: string;
};

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");

    const isDevelopment = mode === "development";

    return {
        plugins: [
            react({
                babel: {
                    plugins: [["babel-plugin-react-compiler"]],
                },
            }),
        ],

        define: {
            __APP_VERSION__: JSON.stringify(packageJson.version ?? "0.0.0"),
            __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
        },

        server: isDevelopment
            ? {
                port: 5173,
                strictPort: true,
                proxy: {
                    "/api": {
                        target:
                            env.VITE_GRCPC_DEV_API_TARGET ||
                            "http://127.0.0.1:8080",
                        changeOrigin: true,
                        configure: (proxy) => {
                            proxy.on("error", (_error, _request, response) => {
                                if (
                                    !("req" in response) ||
                                    response.headersSent ||
                                    response.writableEnded
                                ) {
                                    return;
                                }

                                response
                                    .writeHead(503, {
                                        "Content-Type": "application/json; charset=utf-8",
                                    })
                                    .end(JSON.stringify({ code: "NETWORK_ERROR" }));
                            });
                        },
                    },
                },
            }
            : undefined,

        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
        },
    };
});

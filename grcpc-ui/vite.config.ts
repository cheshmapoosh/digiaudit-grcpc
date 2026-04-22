import {defineConfig, loadEnv} from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

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
        server: isDevelopment
            ? {
                port: 5173,
                strictPort: true,
                proxy: {
                    "/api": {
                        target: env.VITE_GRCPC_DEV_API_TARGET || "http://localhost:8080",
                        changeOrigin: true,
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
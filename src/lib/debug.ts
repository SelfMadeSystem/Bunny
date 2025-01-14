import { getAssetIDByName } from "@lib/api/assets";
import { getLoaderName, isThemeSupported } from "@lib/api/native/loader";
import { BundleUpdaterManager, ClientInfoManager, DeviceManager } from "@lib/api/native/modules";
import { after } from "@lib/api/patcher";
import { _getThemeFromLoader, selectTheme } from "@lib/managers/themes";
import { settings } from "@lib/settings";
import { logger } from "@lib/utils/logger";
import { showToast } from "@ui/toasts";
import { version } from "bunny-build";
import { Platform, type PlatformConstants } from "react-native";
export let socket: WebSocket;

export interface RNConstants extends PlatformConstants {
    // Android
    Version: number;
    Release: string;
    Serial: string;
    Fingerprint: string;
    Model: string;
    Brand: string;
    Manufacturer: string;
    ServerHost?: string;

    // iOS
    forceTouchAvailable: boolean;
    interfaceIdiom: string;
    osVersion: string;
    systemName: string;
}

export async function _toggleSafeMode() {
    settings.safeMode = { ...settings.safeMode, enabled: !settings.safeMode?.enabled };
    if (isThemeSupported()) {
        if (_getThemeFromLoader()?.id) settings.safeMode!.currentThemeId = _getThemeFromLoader()!.id;
        if (settings.safeMode?.enabled) {
            await selectTheme("default");
        } else if (settings.safeMode?.currentThemeId) {
            await selectTheme(settings.safeMode?.currentThemeId);
        }
    }
    setTimeout(BundleUpdaterManager.reload, 400);
}

export function connectToDebugger(url: string) {
    if (socket !== undefined && socket.readyState !== WebSocket.CLOSED) socket.close();

    if (!url) {
        showToast("Invalid debugger URL!", getAssetIDByName("Small"));
        return;
    }

    socket = new WebSocket(`ws://${url}`);

    socket.addEventListener("open", () => showToast("Connected to debugger.", getAssetIDByName("Check")));
    socket.addEventListener("message", (message: any) => {
        try {
            (0, eval)(message.data);
        } catch (e) {
            console.error(e);
        }
    });

    socket.addEventListener("error", (err: any) => {
        console.log(`Debugger error: ${err.message}`);
        showToast("An error occurred with the debugger connection!", getAssetIDByName("Small"));
    });
}

export function _patchLogHook() {
    const unpatch = after("nativeLoggingHook", globalThis, args => {
        if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ message: args[0], level: args[1] }));
        logger.log(args[0]);
    });

    return () => {
        socket && socket.close();
        unpatch();
    };
}

export const _versionHash = version;

export function getDebugInfo() {
    // Hermes
    const hermesProps = window.HermesInternal.getRuntimeProperties();
    const hermesVer = hermesProps["OSS Release Version"];
    const padding = "for RN ";

    // RN
    const PlatformConstants = Platform.constants as RNConstants;
    const rnVer = PlatformConstants.reactNativeVersion;

    return {
        /** @deprecated */
        vendetta: {
            version: _versionHash,
            loader: getLoaderName(),
        },
        bunny: {
            version: _versionHash,
            loader: getLoaderName(),
        },
        discord: {
            version: ClientInfoManager.Version,
            build: ClientInfoManager.Build,
        },
        react: {
            version: React.version,
            nativeVersion: hermesVer.startsWith(padding) ? hermesVer.substring(padding.length) : `${rnVer.major}.${rnVer.minor}.${rnVer.patch}`,
        },
        hermes: {
            version: hermesVer,
            buildType: hermesProps.Build,
            bytecodeVersion: hermesProps["Bytecode Version"],
        },
        ...Platform.select(
            {
                android: {
                    os: {
                        name: "Android",
                        version: PlatformConstants.Release,
                        sdk: PlatformConstants.Version
                    },
                },
                ios: {
                    os: {
                        name: PlatformConstants.systemName,
                        version: PlatformConstants.osVersion
                    },
                }
            }
        )!,
        ...Platform.select(
            {
                android: {
                    device: {
                        manufacturer: PlatformConstants.Manufacturer,
                        brand: PlatformConstants.Brand,
                        model: PlatformConstants.Model,
                        codename: DeviceManager.device
                    }
                },
                ios: {
                    device: {
                        manufacturer: DeviceManager.deviceManufacturer,
                        brand: DeviceManager.deviceBrand,
                        model: DeviceManager.deviceModel,
                        codename: DeviceManager.device
                    }
                }
            }
        )!
    };
}

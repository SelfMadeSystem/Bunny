import { messageUtil } from "@metro/common";
import { plugins as pluginStorage } from "@lib/plugins";
import { Strings } from "@/lib/i18n";
import { ApplicationCommand, ApplicationCommandOptionType } from "../types";

export default () => <ApplicationCommand>{
    name: "plugins",
    description: Strings.COMMAND_DEBUG_DESC,
    options: [
        {
            name: "ephemeral",
            displayName: "ephemeral",
            type: ApplicationCommandOptionType.BOOLEAN,
            description: Strings.COMMAND_DEBUG_OPT_EPHEMERALLY,
        }
    ],
    execute([ephemeral], ctx) {
        const plugins = Object.values(pluginStorage).sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));

        const enabled = plugins.filter(p => p.enabled).map(p => p.manifest.name);
        const disabled = plugins.filter(p => !p.enabled).map(p => p.manifest.name);

        const content = [
            `**Installed Plugins (${plugins.length}):**`,
            ...(enabled.length > 0 ? [
                `Enabled (${enabled.length}):`,
                "> " + enabled.join(", "),
            ] : []),
            ...(disabled.length > 0 ? [
                `Disabled (${disabled.length}):`,
                "> " + disabled.join(", "),
            ] : []),
        ].join("\n");

        if (ephemeral?.value) {
            messageUtil.sendBotMessage(ctx.channel.id, content);
        } else {
            messageUtil.sendMessage(ctx.channel.id, { content });
        }
    }
}
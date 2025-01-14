import { Strings } from "@core/i18n";
import { DeviceManager } from "@lib/api/native/modules";
import { after } from "@lib/api/patcher";
import { _toggleSafeMode } from "@lib/debug";
import { settings } from "@lib/settings";
import { ButtonColors } from "@lib/utils/types";
import { findByName, findByProps } from "@metro/filters";
import { semanticColors } from "@ui/color";
import { Codeblock, ErrorBoundary as _ErrorBoundary } from "@ui/components";
import { Button, SafeAreaView } from "@ui/components/discord";
import { createThemedStyleSheet, TextStyleSheet } from "@ui/styles";
import { Text, View } from "react-native";

const ErrorBoundary = findByName("ErrorBoundary");

// Let's just pray they have this.
const { BadgableTabBar } = findByProps("BadgableTabBar");

const styles = createThemedStyleSheet({
    container: {
        flex: 1,
        backgroundColor: semanticColors.BACKGROUND_PRIMARY,
        paddingHorizontal: 16,
    },
    header: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginVertical: 8,
    },
    headerTitle: {
        ...TextStyleSheet["heading-md/semibold"],
        textAlign: "center",
        textTransform: "uppercase",
        color: semanticColors.HEADER_PRIMARY,
    },
    headerDescription: {
        ...TextStyleSheet["text-sm/medium"],
        textAlign: "center",
        color: semanticColors.TEXT_MUTED,
    },
    footer: {
        flexDirection: DeviceManager.isTablet ? "row" : "column",
        justifyContent: "flex-end",
        marginVertical: 8,
    },
});

interface Tab {
    id: string;
    title: string;
    trimWhitespace?: boolean;
}

interface Button {
    text: string;
    // TODO: Proper types for the below
    color?: string;
    size?: string;
    onPress: () => void;
}

const tabs: Tab[] = [
    { id: "message", title: Strings.MESSAGE },
    { id: "stack", title: Strings.STACK_TRACE },
    { id: "componentStack", title: Strings.COMPONENT, trimWhitespace: true },
];

export default () => after("render", ErrorBoundary.prototype, function (this: any, _, ret) {
    if (!this.state.error) return;

    // Not using setState here as we don't want to cause a re-render, we want this to be set in the initial render
    this.state.activeTab ??= "message";
    const tabData = tabs.find(t => t.id === this.state.activeTab);
    const errorText: string = this.state.error[this.state.activeTab];

    // This is in the patch and not outside of it so that we can use `this`, e.g. for setting state
    const buttons: Button[] = [
        { text: Strings.RELOAD_DISCORD, onPress: this.handleReload },
        ...!settings.safeMode?.enabled ? [{ text: Strings.RELOAD_IN_SAFE_MODE, onPress: _toggleSafeMode }] : [],
        { text: Strings.RETRY_RENDER, color: ButtonColors.RED, onPress: () => this.setState({ info: null, error: null }) },
    ];

    return (
        <_ErrorBoundary>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <ret.props.Illustration style={{ transform: [{ scale: 0.6 }], marginLeft: -40, marginRight: -80 }} />
                    <View style={{ flex: 2, paddingLeft: 24 }}>
                        <Text style={styles.headerTitle}>{ret.props.title}</Text>
                        <Text style={styles.headerDescription}>{ret.props.body}</Text>
                    </View>
                </View>
                <View style={{ flex: 6 }}>
                    <View style={{ paddingBottom: 8 }}>
                        {/* Are errors caught by ErrorBoundary guaranteed to have the component stack? */}
                        <BadgableTabBar
                            tabs={tabs}
                            activeTab={this.state.activeTab}
                            onTabSelected={(tab: string) => { this.setState({ activeTab: tab }); }}
                        />
                    </View>
                    <Codeblock
                        selectable
                        style={{ flex: 1, textAlignVertical: "top" }}
                    >
                        {/*
                            TODO: I tried to get this working as intended using regex and failed.
                            When trimWhitespace is true, each line should have it's whitespace removed but with it's spaces kept.
                        */}
                        {tabData?.trimWhitespace ? errorText.split("\n").filter(i => i.length !== 0).map(i => i.trim()).join("\n") : errorText}
                    </Codeblock>
                </View>
                <View style={styles.footer}>
                    {buttons.map(button => {
                        const buttonIndex = buttons.indexOf(button) !== 0 ? 8 : 0;

                        return <Button
                            text={button.text}
                            color={button.color ?? ButtonColors.BRAND}
                            size={button.size ?? "small"}
                            onPress={button.onPress}
                            style={DeviceManager.isTablet ? { flex: `0.${buttons.length}`, marginLeft: buttonIndex } : { marginTop: buttonIndex }}
                        />;
                    })}
                </View>
            </SafeAreaView>
        </_ErrorBoundary>
    );
});

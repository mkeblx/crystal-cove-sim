FPSMeter.theme.oculus = {
    heatmaps: [
        {
            saturation: 0.5,
            lightness: 0.6
        }
    ],
    container: {
        // Settings
        heatOn: "backgroundColor",

        // Styles
        padding: "5px",
        minWidth: "95px",
        height: "30px",
        lineHeight: "30px",
        textAlign: "right",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid #ccc",
        borderColor: "rgba(0,0,0,0.1)",
        color: "#fff",
        textShadow: "1px 1px 0 rgba(0,0,0,.2)"
    },
    count: {
        // Styles
        position: "absolute",
        top: 0,
        right: 0,
        padding: "5px 10px",
        height: "30px",
        fontSize: "24px",
        fontWeight: 200,
        zIndex: 2
    },
    legend: {
        // Styles
        position: "absolute",
        top: 0,
        left: 0,
        padding: "5px 10px",
        height: "30px",
        fontSize: "12px",
        lineHeight: "32px",
        textAlign: "left",
        float: "left",
        zIndex: 2
    },
    graph: {
        // Styles
        position: "relative",
        boxSizing: "padding-box",
        MozBoxSizing: "padding-box",
        height: "100%",
        zIndex: 1
    },
    column: {
        // Settings
        width: 4,
        spacing: 1,

        // Styles
        background: 'transparent',
        backgroundColor: "#3878ff"
    }
};
import ElectionStateWarning from "./ElectionStateWarning"

const DraftWarning = () => {
    return (
        <ElectionStateWarning
            state="draft"
            title="draft_warning.title"
            description="draft_warning.description"
        />
    );
}

export default DraftWarning;
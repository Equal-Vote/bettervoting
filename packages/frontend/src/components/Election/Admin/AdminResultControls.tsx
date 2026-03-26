import useElection from "~/components/ElectionContextProvider";
import ElectionStateWarning from "../ElectionStateWarning"

export default () => {
    const { election, voterAuth } = useElection();

    if(voterAuth?.roles?.length == 0) return <></>;

    return <ElectionStateWarning title='results.admin_title' description='blah blah' hideIcon>
        You're special
    </ElectionStateWarning>
}
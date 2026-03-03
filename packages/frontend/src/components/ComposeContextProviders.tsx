// https://stackoverflow.com/questions/51504506/too-many-react-context-providers

interface Props {
    providers: Array<React.JSXElementConstructor<React.PropsWithChildren<unknown>>>
    children: React.ReactNode
}

const ComposeContextProviders = (props: Props) => {
    const { providers = [], children } = props;

    return (
        <>
            {providers.reduceRight((acc, Comp) => {
                return <Comp>{acc}</Comp>;
            }, children)}
        </>
    )
}

export default ComposeContextProviders
import { ReactElement } from "react"

type PermissionHandlerProps = {
    permissions: string[],
    requiredPermission: string,
    children: ReactElement
}

const PermissionHandler = ({permissions,requiredPermission,children}:PermissionHandlerProps) => {
    if (permissions && permissions.includes(requiredPermission)){
        return children
    }
    return <></>
}

export default PermissionHandler

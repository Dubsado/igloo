import { HTTPMethods, Handler, Node, root } from '../node'

type Params = Record<string, string>

type Return = {
    handler: Handler
    middleware: Handler[]
    params: Params
}

const routeCache: Record<string, Record<HTTPMethods, Return>> = {}

//Helper function that can be used to set the cache values for dynamic and static routes.
export const addToRouteCache = (
    path: string,
    method: HTTPMethods,
    returnObject: Return
) => {
    if (!routeCache[path]) {
        //@ts-ignore
        routeCache[path] = {}
    }
    return (routeCache[path][method] = returnObject)
}

// Function to find a route and its handler
export const findRoute = (path: string, method: HTTPMethods): Return | null => {
    if (routeCache[path]) {
        return routeCache[path][method]
    }
    const { node, params } = loopSegments(path)
    //If there's no handler, it was not defined
    if (!node || !node.handler || !node.handler[method]) {
        return null
    }
    // add to the cache and return our result
    return addToRouteCache(path, method, {
        handler: node.handler[method],
        middleware: node.middleware,
        params,
    })
}

function loopSegments(path: string) {
    //Start at the root node
    let node: Node | null = root
    //Split path into segments
    const segments = path.split('/').filter(Boolean)
    //Initialize params object
    const params: Params = {}
    for (const segment of segments) {
        //Loop through each segment
        node = handleSegment(node, segment, params)
        if (!node) {
            return { node: null }
        }
    }
    return { node, params }
}

//Match static -> dynamic -> 404 not found routes
function handleSegment(
    node: Node,
    segment: string,
    params: Params
): Node | null {
    // First try to match a static route
    if (node.staticChildren[segment]) {
        return node.staticChildren[segment]
    }
    // If no static route, try to match a dynamic route
    if (node.dynamicChild) {
        //Capture the dynamic parameter
        params[node.dynamicChild.dynamicName!] = segment
        return node.dynamicChild
    } else {
        //No matching route, exit
        return null
    }
}

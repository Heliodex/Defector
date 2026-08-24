import { configure } from "arktype/config"
import type {
	BaseNode,
	NodeSelector,
} from "/home/heliodex/Documents/ysws2/node_modules/@ark/schema/out/node.d.ts"
import type {
	BaseNodeDeclaration,
	TypeMeta,
} from "/home/heliodex/Documents/ysws2/node_modules/@ark/schema/out/shared/declare.d.ts"

configure({ onUndeclaredKey: "reject" })

export * from "arktype"

const requiredField = (field: string) => (n: BaseNode<BaseNodeDeclaration>) =>
	n.kind === "required" && n.expression.startsWith(`${field}: `)

export const makeMessage = (
	field: string,
	msg: string
): [TypeMeta.MappableInput, NodeSelector.Single] => [
	{ message: () => msg },
	requiredField(field),
]

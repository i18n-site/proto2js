#!/usr/bin/env bun

import { parse } from "proto-parser"

const BaseType = "BaseType",
	gen = (pkg_prefix, nested, prefix) => {
		const pathCode = []
		if (!nested) return pathCode

		const push = pathCode.push.bind(pathCode)

		for (const val of Object.values(nested)) {
			let { name, syntaxType } = val
			let prefix_name = prefix ? prefix + "/" + name : name
			console.log("- " + prefix_name)
			switch (syntaxType) {
				case "EnumDefinition": {
					let t = []
					for (const [k, v] of Object.entries(val.values)) {
						t.push(`${k} = ${v}`)
					}
					if (t.length) {
						push([prefix_name, "export const " + t.join(",\n  ")])
					}
					break
				}
				default:
					const { fields, nested } = val
					let import_type = new Set(),
						args = [],
						getType = (type, repeated) => {
							let { value, syntaxType } = type
							value = repeated ? value + "Li" : value
							if (syntaxType == BaseType) {
								import_type.add(value)
								return value
							}
							console.log("TODO type", type, pkg_prefix)
						}
					Object.values(fields).forEach((o) => {
						const { id, name, map, repeated } = o,
							type = getType(o.type, repeated)

						let args_type

						if (map) {
							import_type.add("map")
							args_type = "map(" + getType(o.keyType) + "," + type + ")"
						} else {
							args_type = type
						}
						args[id - 1] = "/* " + id + " " + name + " */ " + args_type
					})
					if (import_type.size) {
						import_type = ", " + Array.from(import_type).toSorted().join(", ")
					} else {
						import_type = ""
					}

					if (args.length) {
						args = "\n  " + args.join(",\n  ") + "\n"
					} else {
						args = ""
					}

					;[..."ED"].forEach((kind) => {
						push([
							name + kind,
							`import { $${import_type} } from "@i18n.site/proto/${kind}.js"

export default $([${args}])`,
						])
					})

					if (nested) {
						push(...gen(pkg_prefix, nested, prefix_name))
					}
			}
		}
		return pathCode
	}

export default (proto) => {
	const parsed = parse(proto)
	if (parsed.error) {
		throw new Error("line " + parsed.line + ": " + parsed.message)
	}
	let {
			root: { nested },
			package: pkg,
		} = parsed,
		pkg_prefix = "."
	if (pkg) {
		nested = Object.values(nested)[0].nested
		pkg_prefix += pkg + "."
	}
	return gen(pkg_prefix, nested)
}

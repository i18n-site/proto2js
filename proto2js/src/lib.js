#!/usr/bin/env bun

import { parse } from "proto-parser"

const BaseType = "BaseType",
	findType = (pkg, root_nested) => (type_name) => {
		if (!type_name.startsWith(pkg)) {
			return
		}

		type_name = type_name.slice(pkg.length).split(".")

		const type_name_len = type_name.length

		if (!type_name_len) {
			return
		}

		let n = 0,
			type = root_nested

		while (n < type_name_len) {
			type = type.nested[type_name[n]]
			if (!type) return
			++n
		}
		return [type_name, type]
	},
	gen = (find, root_nested, prefix) => {
		const pathCode = []
		if (!root_nested) return pathCode

		const push = pathCode.push.bind(pathCode)

		for (const val of Object.values(root_nested)) {
			let { name, syntaxType } = val
			let prefix_name = prefix.concat([name]).join("/")
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
					let proto_import = new Set(),
						args = [],
						comment,
						getType = (type, repeated) => {
							let { value, syntaxType } = type
							if (syntaxType == BaseType) {
								value = repeated ? value + "Li" : value
								proto_import.add(value)
								return value
							} else if (syntaxType == "Identifier") {
								const finded = find(type.resolvedValue)
								// console.log({ finded })
								if (finded) {
									const findedSyntaxType = finded[1].syntaxType
									if (findedSyntaxType == "EnumDefinition") {
										if (!comment.includes(":")) {
											comment += " :"
										}
										comment += " enum " + value
										value = "int32"
										if (repeated) value += "Li"
										proto_import.add(value)
										return value
									} else if (findedSyntaxType == "MessageDefinition") {
										console.log({ type, finded })
										const name = finded[0].join("$")
										return repeated ? "[" + name + "]" : name
									}
								}
							}
							console.log("TODO : getType", type)
						}
					Object.values(fields).forEach((o) => {
						const { id, name, map, repeated } = o
						comment = id + " " + name

						if (repeated) {
							comment += " : repeated"
						}

						const type = getType(o.type, repeated)

						let args_type

						if (map) {
							proto_import.add("map")
							args_type = "map(" + getType(o.keyType) + "," + type + ")"
						} else {
							args_type = type
						}
						args[id - 1] = "/* " + comment + " */ " + args_type
					})
					if (proto_import.size) {
						proto_import = ", " + Array.from(proto_import).toSorted().join(", ")
					} else {
						proto_import = ""
					}

					if (args.length) {
						args = "\n  " + args.join(",\n  ") + "\n"
					} else {
						args = ""
					}

					;[..."ED"].forEach((kind) => {
						push([
							prefix_name + kind,
							`import { $${proto_import} } from "@i18n.site/proto/${kind}.js"

export default $([${args}])`,
						])
					})

					if (nested) {
						push(...gen(find, nested, prefix.concat([name])))
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

	return gen(findType(pkg_prefix, { nested }), nested, [])
}

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
	gen = (find, root_nested, prefix_li) => {
		const pathCode = []
		if (!root_nested) return pathCode

		const push = pathCode.push.bind(pathCode)

		for (const val of Object.values(root_nested)) {
			let { name, syntaxType } = val
			let prefix_name = prefix_li.concat([name]).join("/")
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
						js_import = new Set(),
						args = [],
						comment,
						getType = (type, repeated) => {
							const typeStr = (type) => {
								if (repeated) {
									if (["string", "bytes"].includes(type)) {
										proto_import.add(type)
										return "[" + type + "]"
									}
									type = type + "Li"
									proto_import.add(type)
									return type
								}
								proto_import.add(type)
								return type
							}
							let { value, syntaxType } = type
							if (syntaxType == BaseType) {
								return typeStr(value)
							} else if (syntaxType == "Identifier") {
								const finded = find(type.resolvedValue)
								// console.log({ finded })
								if (finded) {
									const findedSyntaxType = finded[1].syntaxType
									if (findedSyntaxType == "EnumDefinition") {
										comment +=
											" : " +
											(repeated ? "[enum " + value + "]" : "enum " + value)
										value = "int32"
										if (repeated) value += "Li"
										proto_import.add(value)
										return value
									} else if (findedSyntaxType == "MessageDefinition") {
										const name = finded[0].join("$")
										js_import.add(name)
										return repeated ? "[" + name + "]" : name
									}
								}
							}
							console.log("TODO : getType", type)
						}
					Object.values(fields).forEach((o) => {
						const { id, name, map, repeated } = o
						comment = id + " " + name

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

					js_import = [...js_import].toSorted()
					const rel = prefix_li.length
						? prefix_li.map(() => "..").join("/")
						: "."

					;["E", "D"].forEach((kind) => {
						push([
							prefix_name + kind,
							`import { $${proto_import} } from "@i18n.site/proto/${kind}.js"
${js_import.map((i) => "import " + i + ' from "' + rel + "/" + i.replaceAll("$", "/") + kind + '.js"').join("\n")}
export default $([${args}])`,
						])
					})

					if (nested) {
						push(...gen(find, nested, prefix_li.concat([name])))
					}
			}
		}
		return pathCode
	}

export default (proto) => {
	const parsed = parse(proto)
	console.log("parsed", parsed.root)
	return []
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

#!/usr/bin/env bun

import read from "@3-/read"
import write from "@3-/write"
import { join } from "node:path"
import gen from "../src/lib.js"
import { walkRel } from "@3-/walk"
import { existsSync, rmSync } from "node:fs"

const dirGen = async (proto_dir, out_dir) => {
	if (existsSync(out_dir)) {
		rmSync(out_dir, { recursive: true, force: true })
	}
	for (const fp of walkRel(proto_dir, (i) => {
		i.startsWith(".") || ["node_modules"].includes(i)
	})) {
		if (fp.endsWith(".proto")) {
			console.log(fp)

			const path = join(proto_dir, fp),
				code = read(path),
				out_prefix = join(out_dir, fp.slice(0, -6))
			let r
			try {
				r = gen(code)
			} catch (e) {
				console.error(e)
				throw new Error(fp)
			}
			r.forEach(([k, v]) => {
				write(join(out_prefix, k + ".js"), v)
			})
		}
	}
}

const ROOT = import.meta.dirname
await dirGen(join(ROOT, "demo"), join(ROOT, "out"))

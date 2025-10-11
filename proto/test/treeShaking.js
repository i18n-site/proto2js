import { rolldown } from "rolldown"
import { writeFileSync } from "node:fs"

const minify = async (input, manualPureFunctions, toplevel) => {
	const {
		output: [{ code }],
	} = await (
		await rolldown({
			input,
			treeshake: {
				preset: "smallest",
				unknownGlobalSideEffects: false,
				moduleSideEffects: false,
				manualPureFunctions,
			},
		})
	).generate({
		format: "esm",
		minify: {
			compress: {
				target: "esnext",
			},
			mangle: {
				toplevel,
			},
		},
	})
	return code
}

const _treeshake = async (input, manualPureFunctions, pre_len) => {
	const code = await minify(input, manualPureFunctions, false),
		code_len = code.length

	if (code_len < pre_len) {
		writeFileSync(input, code)
		return _treeshake(input, manualPureFunctions, code_len)
	}
	return code
}

export default async (input, manualPureFunctions) => {
	const code = await _treeshake(input, manualPureFunctions, Infinity)
	writeFileSync(input, code)
	return await minify(input, manualPureFunctions, true)
}

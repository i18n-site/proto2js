import read from "@3-/read"

export default (path, include_dir) => {
	processed = new Set()
	if (processed.has(path)) {
		return "" // 如果已经处理过，返回空字符串以避免重复和死循环
	}
	processed.add(path)

	const txt = read(path)
	const import_regex = /import\s+"([^"]+)";/g
	let result

	return result.replace(importRegex, "")
}

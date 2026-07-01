function forwardedValue(args, flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

export function publishCommandEnv(command, args = [], baseEnv = {}) {
  if (command !== "npm" || args[0] !== "run" || args[1] !== "site:publish") {
    return baseEnv;
  }
  const sourceDate = forwardedValue(args, "--date");
  const sourceTime = forwardedValue(args, "--scheduled-time");
  return {
    ...baseEnv,
    ...(sourceDate ? { PUBLISH_SOURCE_DATE: sourceDate } : {}),
    ...(sourceTime ? { PUBLISH_SOURCE_TIME: sourceTime } : {})
  };
}

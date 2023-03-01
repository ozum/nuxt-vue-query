import { H3Event } from "h3";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default eventHandler(async (event: H3Event) => {
  await sleep(1000);
  const data = new Date().getTime();
  console.log("API: ", data);
  return { a: data };
});

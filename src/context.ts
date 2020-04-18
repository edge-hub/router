export class Context {
  constructor(event: FetchEvent) {}
  protected _instanceToJson(instance: any) {
    return [...instance].reduce((obj, item) => {
      const key = item[0] as string;
      if (obj[key]) {
        obj[key] = Array.isArray(obj[key])
          ? [...obj[key], item[1]]
          : [obj[key], item[1]];
        return obj;
      }

      const prop: { [key: string]: any } = {};
      prop[key] = item[1];
      return { ...obj, ...prop };
    }, {});
  }
}

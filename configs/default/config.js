module.exports = {
  title: "Default Configuration",
  type: "object",
  properties: {
    options: {
      title: "Options",
      type: "object",
      properties: {
        storeFrontUrl: {
          type: "string",
        },
        domain: {
          type: "string",
        },
        username: {
          type: "string",
        },
        password: {
          type: "string",
        },
        desktop: {
          type: "string",
        },
      },
      required: ["storeFrontUrl", "domain", "desktop"],
    },
  },
}

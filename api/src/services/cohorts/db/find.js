function createFind({ id, include: callerInclude = {} }) {
  return async (prisma) => {
    const defaultInclude = {
      author: true,
    };
    return prisma.cohort_view.findUniqueOrThrow({
      where: {
        id,
      },
      include: {
        ...defaultInclude,
        ...callerInclude, // caller can override or extend includes
      },
    });
  };
}

module.exports = { createFind };

FROM wikimedia/nodejs
RUN mkdir /opt/service
ADD . /opt/service
COPY dist/config.yaml /opt/service/
WORKDIR /opt/service
ENV HOME=/root LINK=g++ BUN_INSTALL=/root/.bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH=/root/.bun/bin:$PATH
RUN bun install --frozen-lockfile
ENV IN_DOCKER=1
CMD bun run start

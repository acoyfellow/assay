import type { Html, HtmlBuilder } from "foldkit/html";
import { BELLY, CLOUDFLARE_PATHS, DRAGON_BODY, FIRE, type Point, WING_DOWN, WING_UP } from "./dragon-art.ts";
import type { Message } from "./message.ts";
import { Peek } from "./mounts.ts";

type H = HtmlBuilder<Message>;
const pixel = (h: H, [x, y]: Point, className = ""): Html =>
  h.rect(
    [h.X(String(x)), h.Y(String(y)), h.Width("2"), h.Height("2"), ...(className ? [h.Class(className)] : [])],
    [],
  );

export const dragon = (h: H): Html =>
  h.span(
    [h.Class("ml-1.5 inline-block h-5 w-16 align-[-5px]"), h.AriaHidden(true), h.DataAttribute("dragon", "")],
    [
      h.svg(
        [h.ViewBox("0 0 64 20"), h.ShapeRendering("crispEdges"), h.Class("block h-5 w-16 fill-[#ffa45c]")],
        [
          ...DRAGON_BODY.map((at) => pixel(h, at)),
          h.g(
            [h.Class("animate-wing-up")],
            WING_UP.map((at) => pixel(h, at)),
          ),
          h.g(
            [h.Class("animate-wing-down")],
            WING_DOWN.map((at) => pixel(h, at)),
          ),
          h.g(
            [h.Class("animate-inhale fill-[#fff3dc]")],
            BELLY.map((at) => pixel(h, at)),
          ),
          pixel(h, [30, 2], "fill-k1"),
          h.g(
            [],
            FIRE.map(([x, y, phase, hot]) =>
              pixel(
                h,
                [x, y],
                `opacity-0 animate-fire-${phase} ${hot ? "fill-[#fff3dc]" : "fill-[#ff6a1a]"}`,
              ),
            ),
          ),
        ],
      ),
    ],
  );

export const astronaut = (h: H): Html =>
  h.div(
    [
      h.Class(
        "pointer-events-none absolute bottom-full left-8 h-[154px] w-[min(170px,34vw)] overflow-hidden",
      ),
      h.AriaHidden(true),
      h.DataAttribute("peek", ""),
      h.OnMount(Peek()),
    ],
    [
      h.img([
        h.Src("/brand/astronaut-peek.webp"),
        h.Alt(""),
        h.Width("400"),
        h.Height("362"),
        h.Loading("lazy"),
        h.Class(
          "absolute bottom-0 left-0 h-auto w-full origin-bottom [transform:translateY(calc((1_-_var(--peek,0))_*_100%))_rotate(calc((1_-_var(--peek,0))_*_-10deg))] motion-reduce:[transform:none]",
        ),
      ]),
    ],
  );

export const cloudflareLogo = (h: H): Html =>
  h.svg(
    [
      h.Xmlns("http://www.w3.org/2000/svg"),
      h.ViewBox("0 0 341 156"),
      h.Width("57"),
      h.Height("26"),
      h.Role("img"),
      h.AriaLabel("Cloudflare"),
      h.Class("block h-[26px] w-[57px] flex-none"),
      h.InnerHTML(CLOUDFLARE_PATHS),
    ],
    [],
  );

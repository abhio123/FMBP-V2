import { fireEvent, render, screen } from "@testing-library/react-native";
import { MessageBubble } from "../MessageBubble";
import type { MessageRow } from "../api";

// The reply arrow (Reanimated) is only drawn while swiping, and the swipe wrapper is mocked below, so a minimal
// stand-in for the Reanimated pieces the bubble imports is enough here.
jest.mock("react-native-reanimated", () => {
  const { View } = jest.requireActual("react-native");
  return { __esModule: true, default: { View }, Extrapolation: { CLAMP: "clamp" }, interpolate: () => 0, useAnimatedStyle: () => ({}) };
});
// the swipe gesture needs native modules; a plain wrapper is enough to test what the bubble shows and does
jest.mock("react-native-gesture-handler/ReanimatedSwipeable", () => {
  const { View } = jest.requireActual("react-native");
  return { __esModule: true, default: ({ children }: { children: React.ReactNode }) => <View>{children}</View> };
});

const msg: MessageRow = {
  id: "m2", conversation_id: "c1", sender_business_id: "b2", body: "Hi", attachment_url: null, read_at: null,
  created_at: "2026-11-03T09:21:00Z", post_id: "p1", reply_to_id: "m1",
};

describe("<MessageBubble>", () => {
  it("shows the post it is about and the quoted message inside the bubble", async () => {
    const onJump = jest.fn();
    await render(
      <MessageBubble message={msg} mine={false} receipt={null} highlighted={false} onReply={jest.fn()}
        post={{ postRef: { id: "p1", title: "Need Machine in Greater Noida", status: "expired", deleted: false, icon: "⚙️" }, loading: false, onOpen: jest.fn() }}
        quote={{ name: "You", body: "Do you still need the machine?", postTitle: "Need Machine in Greater Noida", onJump }} />,
    );
    // the post in one short line: "Post: " + its first 20 letters + "…", instead of a generic "About this post"
    const line = screen.getByText("chat.postLabel Need Machine in Grea…");
    expect(line.props.numberOfLines).toBe(1);
    expect(screen.queryByText(/aboutPost/)).toBeNull();
    expect(screen.getByText(/^\d{1,2}:\d{2} (am|pm)$/)).toBeTruthy(); // time, same format on iPhone and Android
    expect(screen.getByText(/post\.status\.expired|Expired/)).toBeTruthy();   // status shown for a post that is not live
    expect(screen.getByText("Do you still need the machine?")).toBeTruthy(); // quote
    expect(screen.getByText("Hi")).toBeTruthy();
    fireEvent.press(screen.getByText("Do you still need the machine?"));
    expect(onJump).toHaveBeenCalled(); // tap on a quote jumps to the original message
  });

  it("on my green bubble the post line has the same soft colour as the time, dimmer than the message", async () => {
    await render(
      <MessageBubble message={msg} mine receipt={null} highlighted={false} onReply={jest.fn()}
        post={{ postRef: { id: "p1", title: "Offering Franchise in Noida", status: "active", deleted: false, icon: "🏪" }, loading: false, onOpen: jest.fn() }} />,
    );
    const color = (el: { props: { style?: unknown } }) => (Array.isArray(el.props.style) ? Object.assign({}, ...el.props.style) : el.props.style as { color?: string })?.color;
    const postLine = screen.getByText("chat.postLabel Offering Franchise i…");
    const time = screen.getByText(/^\d{1,2}:\d{2} (am|pm)$/);
    expect(color(postLine)).toBe("rgba(255,255,255,0.72)");
    expect(color(postLine)).toBe(color(time));
  });

  it("press and hold starts a reply", async () => {
    const onReply = jest.fn();
    await render(<MessageBubble message={{ ...msg, post_id: null, reply_to_id: null }} mine receipt="Sent" highlighted={false} onReply={onReply} />);
    fireEvent(screen.getByText("Hi"), "longPress");
    expect(onReply).toHaveBeenCalled();
  });
});

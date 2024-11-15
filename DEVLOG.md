# Animus Devlog

## 2024-11-14 1600

I switched to a separate createRoot, but this... doesn't work well. I don't
think React really enjoys nesting createRoot inside of another react tree (with
good reason!). 

It turns out that React does have error boundaries, which I can probably use
instead of the root idea:

https://legacy.reactjs.org/docs/error-boundaries.html

This is easy to turn-on for now, though I suspect iframes will be the way to go
longer term. It's just a bit of a pain to setup the environment for them so I
want to delay that for now.

## 2024-11-14 1400

Not a lot of opportunity to work on this yesterday and limited time today, so
let's try to use it well. As I recall I was thinking about how to improve the
following aspects:

_Form validation_: This feels hacky right now and interacts poorly with more
advanced forms. Instead, I want to provide "utility library" to the LLM which is
constructing the app and let it call in e.g. validate answers. I'll probably
start with a more-or-less hard-coded validation prompt but can play with how
much I want the LLM to construct the prompt itself.

_Form isolation_: Errors in the new form show up as errors in the application
now. Is there an effective way to construct a sub-root for the LLM generated
app? Or just use an iframe? What are the tradeoffs?

## 2024-11-13 1200

The react component works okay: I banged my head on getting the dynamic loading
working far more than I'm happy with, but it seems to be going now: at least I
have Gemini consistently outputting a readable form: I can add more debugging
etc later, but LLMs are generally pretty good at writing React!

I need to revisit how I'm doing form validation now: instead of doing the whole
screen-grab approach, I should be able to have the LLM emit calls to my
validation framework and use that instead; alternatively, have the LLM call my
validation handle with the question & answer & textbook image, and then let it
decide how it wants to render the result: I'm confident a larger LLM will handle
this.

## 2024-11-13 1000

Revisiting this while sober: what's the best workflow? It's difficult for the
LLMs to construct a webform which exactly captures the original book workflow
without help. I can do:

- show the uploaded image side-by-side with the form, and provide it as context
  when answering questions?

The live update is neat, but feels overkill? I think a manual submit would be
easier to structure the prompts for and simplify the user interaction: I would
no longer need this hacky highlighting etc.

I'm not thrilled about the manual scanning the output from the LLM to generate
the live form. I could try to have the LLM generate the complete form for me as
a React app, and just inject globals for common libraries? This prompt with
Sonnet works fairly well and generates a nice-looking form as an artifact.

> Create a react app which mimics this textbook page. The user should be able to
> input answers and call into an LLM to validate the response. You can stub in the
> correct response as a hardcoded answer for the first version. Use your
> judgement. Explain your reasoning in detail.

I could wire this up to some logic for letting it call an LLM to verify the
results.

## 2024-11-12 2000

I'm happy with the basic workflow after a few tweaks and cleanups. I created a
simple hero image etc to spice up the page a bit, and asked Aider to cleanup the
formatting.

I added some basic request logging to the server which helped flush out some
issues with image uploads etc. I'm still being a little lazy with my testing: I
_should_ make the image -> html, and form -> validation work better standalone
or from the command line, but haven't yet... ¯\_(ツ)\_/¯.

Most egregious Aider command:

> +Okay I want a nice splash page again. Create a Landing.tsx and use
> static/hero.jpg for a hero image. add some nice filler about the Animus Codex,
> how it was rumored to be a textbook that lived, and point the user to the book
> page to try it out. Add static/navbar.jpg as a navbar icon.

## 2024-11-12 1900

Played around with a more automated testing environment, but it's a bit rough to
setup for things like "highlight this part of the page for me". You can test in
isolation, but the end-to-end workflow is a bit wonky. I _should_ do a screen
capture for testing model prompts quickly, however.

It's impressively easy to stop doing shallow tests when you're working with web
code!

## 2024-11-12 1800

We've got our outline setup:

- server
- webpack
- some basic webforms
- loading images moves through the model and returns a half-ass page back

Now I realize what I actually want is form elements that would more "float" on
top of the original page image. It's hard to fully recreate the original
behavior of the form, but in theory we could get elements lined up in the right
places?

- [x] Need a better iteration environment, let's rewire Book.tsx to allow the user to specify a generation prompt inline, and update the generated code on demand.

So I'm getting... acceptable results for the form itself, but the validation
needs work. I want to throw more horsepower at this rather than thinking too
hard. I'd like to just take some context from around the users answer (maybe
even the whole page), and let the bot figure out if the user is providing a reasonable response.

Another option would be to highlight the user answer and capture a screenshot. I
see there's https://html2canvas.hertzen.com/documentation which can convert a
page to a screenshot. If I highlighted a users contribution in a particular
color, and then asked the agent to evaluate, that could work.

Aider:

> Adjust the logic in Book.tsx and forms.ts to: change the color of the user
> form element to b e _green_ while in the process of validating. Then capture a
> screenshot using html2canvas. Cha nge server.ts to accept the screenshot of the
> page. Change generate.ts to take a screenshot as input. Adjust all prompts to
> handle the screenshot, e.g.: "examine the attached screenshot an d look at the
> user input in green. Provide your feedback on the users response." etc etc.

## Overview

I'm trying to make an app that lets you upload a textbook image, and then
converts it into a "live" format. This means that things like blanks will
becoming editable on the page, and you'll be able to interact with an LLM to
help decide whether your answers are good or not.

An ideal flow seems like:

- Snap a photo with your phone or otherwise upload
- Ask LLM to convert this to a live page with the same format, but appropriate form elements substituted for blanks:
  - options
  - text box
  - text area
- Setup tab index so control flows through the page naturall
- Evaluate your response either when you submit or on blur
- Configuration page to let you specify the LLM you want to use, toy with the system prompt etc.

## Test cases

I'm learning Japanese so I'm all over this! I have my Tobira grammar notebook I
can use to pull examples from.

## Architecture

I'm just going to slap together a React frontend app to get started with
'react.js' includes etc. I can iterate on the webpack or whatever build later
on. I don't think I need server support unless we add more state to the app. p

## On using LLMs

It's amazing what you can get away with once you start using LLMs in earnest. Most egregious Aider command so far:

> Great, now let's add a src/Book.tsx which: lets the user upload an image (add a
> landing zone to drag images as well). The image will be sent to the
> server /api/design. The server will construct an appropriate request, and
> use OpenRouter to submit it. The prompt will ask the LLM to construct a
> web-form, which _exactly mimics_ the input image, except all blanks in
> the textbook page will be replaced by text fields or selectors as
> appropriate. The returned page should call checkUserAnswers on the blur
> event with all relevant information. Create a library src/forms.ts with
> the logic for checkUserAnswers and any other client side helpers.
> checkUserAnswers should call `/api/validate` with context for the users
> answer. The server should ask the LLM to check the users answer and
> provide feedback in a structured (viz JSON) way. checkUserAnswers should
> render this feedback as floating component near the users answer.

You operate an assay server. Assay runs many agents on one goal and scores each one.

Drive it to this end state, then stop and say DONE:

1. Start an assay with id `job-7`, plan hash `plan-a`, and a budget of 900000 micro-USD. It has two seats:
   - seat `alpha`, shape `haiku-pi`, goal `cart-merge`, worst case 300000 micro-USD
   - seat `beta`, shape `haiku-pi`, goal `cart-merge`, worst case 300000 micro-USD
2. Claim seat `alpha` for runner `bench`. Claim seat `beta` for runner `bench`.
3. Record a receipt for seat `alpha`: outcome `stopped`, 4 turns, 12000 micro-USD spent.
4. Record a receipt for seat `beta`: outcome `stopped`, 6 turns, 21000 micro-USD spent.
5. Grade seat `alpha` as passed, reason `all hidden tests pass`. Grade seat `beta` as failed, reason `2 hidden tests fail`.
6. Read the score of assay `job-7` and report how many seats passed and the total spent.

A seat's id is `<assay id>/<seat>`, for example `job-7/alpha`.

{{SURFACE}}

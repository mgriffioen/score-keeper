/**
 * How to play each preset, short enough to read at the table. These are the
 * common published rules; house rules vary, and the setup screen stays the
 * place to change how a game is scored.
 */
export interface RuleSection {
  heading: string;
  points: string[];
}

export interface GameRules {
  /** One line on what you are trying to do. */
  goal: string;
  /** "2–4 players, one 52-card deck" and the like. */
  needs: string;
  sections: RuleSection[];
}

export const GAME_RULES: Record<string, GameRules> = {
  rummy: {
    goal: 'Meld your hand into sets and runs, and be first to 500 points.',
    needs: '2–6 players, one 52-card deck (two for five or more).',
    sections: [
      {
        heading: 'Deal',
        points: [
          'Ten cards each for two players, seven for three or four, six for five or six.',
          'The rest is the stock, face down; turn one card up to start the discard pile.',
        ],
      },
      {
        heading: 'Your turn',
        points: [
          'Draw one card — the top of the stock or the top of the discard pile.',
          'Lay down any melds: a set is three or four of a kind, a run is three or more in sequence in one suit.',
          'You may also lay off single cards onto melds already on the table, yours or anyone’s.',
          'End by discarding one card. You cannot discard a card you just took from the pile.',
        ],
      },
      {
        heading: 'Going out',
        points: [
          'The hand ends when someone melds or discards their last card.',
          'Aces are low (A-2-3, not Q-K-A) unless your table agrees otherwise.',
        ],
      },
      {
        heading: 'Scoring',
        points: [
          'The player who went out scores the value of every card left in the other hands.',
          'Face cards are 10, aces 1, number cards their pip value.',
          'First to 500 wins.',
        ],
      },
    ],
  },

  'gin-rummy': {
    goal: 'Form your hand into melds before your opponent, and be first to 100.',
    needs: '2 players, one 52-card deck.',
    sections: [
      {
        heading: 'Deal',
        points: [
          'Ten cards each. Turn up one card to start the discard pile; the rest is the stock.',
        ],
      },
      {
        heading: 'Your turn',
        points: [
          'Draw from the stock or take the top discard, then discard one card.',
          'Melds are sets (three or four of a kind) or runs (three or more in suit). Aces are low.',
          'Unmatched cards are deadwood: face cards 10, aces 1, others their pip value.',
        ],
      },
      {
        heading: 'Ending the hand',
        points: [
          'Knock when your deadwood totals 10 or less: lay out your melds and deadwood.',
          'Your opponent then lays off any cards they can onto your melds.',
          'Going gin means knocking with no deadwood at all — nothing can be laid off.',
        ],
      },
      {
        heading: 'Scoring',
        points: [
          'Knocker scores the difference between the two deadwood totals.',
          'If the opponent’s deadwood is equal or lower, that’s an undercut: they score the difference plus 25.',
          'Gin scores 25 plus the opponent’s deadwood.',
          'First to 100 wins the game.',
        ],
      },
    ],
  },

  hearts: {
    goal: 'Avoid taking hearts and the queen of spades. Lowest score wins.',
    needs: '4 players, one 52-card deck.',
    sections: [
      {
        heading: 'Passing',
        points: [
          'Thirteen cards each. Before play, pass three cards: left, then right, then across, then no pass — and repeat.',
        ],
      },
      {
        heading: 'Play',
        points: [
          'Whoever holds the 2 of clubs leads it to the first trick.',
          'Follow suit if you can; otherwise play anything. Highest card of the suit led wins the trick and leads next.',
          'No points may be played on the first trick.',
          'Hearts cannot be led until a heart has been played on another suit (hearts are “broken”).',
        ],
      },
      {
        heading: 'Scoring',
        points: [
          'Each heart you take is 1 point; the queen of spades is 13.',
          'Shooting the moon — taking all 13 hearts and the queen — scores 0 for you and 26 for everyone else.',
          'When someone reaches 100, the game ends and the lowest total wins.',
        ],
      },
    ],
  },

  spades: {
    goal: 'Bid how many tricks your partnership will take, then make it. First to 500 wins.',
    needs: '4 players in two partnerships (partners sit opposite), one 52-card deck.',
    sections: [
      {
        heading: 'Bidding',
        points: [
          'Thirteen cards each. Every player bids how many tricks they expect to take; partners add their bids together.',
          'Bidding nil (zero) is a promise to take no tricks at all.',
        ],
      },
      {
        heading: 'Play',
        points: [
          'Left of the dealer leads. Follow suit if you can; otherwise play anything.',
          'Spades are always trump. They cannot be led until one has been played on another suit.',
          'Highest spade wins the trick, or the highest card of the suit led if no spade was played.',
        ],
      },
      {
        heading: 'Scoring',
        points: [
          'Make your bid: 10 points per trick bid, plus 1 for each extra trick (a bag).',
          'Miss it: lose 10 points per trick bid.',
          'Every ten bags collected costs 100 points.',
          'Nil made is +100, nil missed is −100.',
          'Add each partnership as one player here and enter the team’s score.',
        ],
      },
    ],
  },

  'skull-king': {
    goal: 'Predict exactly how many tricks you’ll win each round, over ten rounds.',
    needs: '2–8 players, the Skull King deck.',
    sections: [
      {
        heading: 'Rounds',
        points: [
          'Round one deals one card each, round two two cards, up to ten cards in round ten.',
          'Everyone bids at once by holding up a fist and throwing out their fingers on the count of three.',
        ],
      },
      {
        heading: 'Play',
        points: [
          'Follow the suit led if you can. Black (Jolly Roger) cards are trump.',
          'Special cards can always be played. Escapes always lose. Mermaids beat every suit card; pirates beat mermaids; the Skull King beats pirates — but a mermaid captures the Skull King.',
        ],
      },
      {
        heading: 'Scoring',
        points: [
          'Bid made: 20 points per trick bid, plus bonuses for capturing 14s and special cards.',
          'Bid missed: −10 per trick you were off by.',
          'Bid zero: made is 10 × the round number; missed is −10 × the round number.',
          'Highest total after round ten wins.',
        ],
      },
    ],
  },

  'oh-hell': {
    goal: 'Call exactly how many tricks you’ll take each hand.',
    needs: '3–7 players, one 52-card deck. Best at four or five.',
    sections: [
      {
        heading: 'The deal',
        points: [
          'The first hand deals ten cards each (fewer at a big table), then one fewer each hand down to one, then back up.',
          'Turn the next card face up: its suit is trump for the hand.',
        ],
      },
      {
        heading: 'Bidding',
        points: [
          'Starting left of the dealer, everyone says how many tricks they will take.',
          'Many tables play “screw the dealer”: the total bid may not equal the number of tricks, so someone must miss.',
        ],
      },
      {
        heading: 'Play',
        points: [
          'Left of the dealer leads. Follow suit if you can; otherwise play anything, trump included.',
          'Highest trump wins, or the highest card of the suit led.',
        ],
      },
      {
        heading: 'Scoring',
        points: [
          'One point for every trick you take.',
          'A 10-point bonus if you took exactly what you called — bid 3, take 3, score 13.',
          'Bid 3 and take 4 scores just 4. Bidding zero and making it earns the 10.',
        ],
      },
    ],
  },

  wizard: {
    goal: 'Predict exactly how many tricks you’ll win in each round.',
    needs: '3–6 players, the 60-card Wizard deck (52 cards plus 4 wizards and 4 jesters).',
    sections: [
      {
        heading: 'Rounds',
        points: [
          'Round one deals one card each, round two two, and so on until the deck runs out — 20 rounds for three players, 15 for four.',
          'Turn the next card up for trump. A wizard means the dealer picks trump; a jester, or no card left, means no trump.',
        ],
      },
      {
        heading: 'Play',
        points: [
          'Each player bids in turn, starting left of the dealer.',
          'Follow suit if you can. Wizards and jesters can be played at any time.',
          'The first wizard played wins the trick. Otherwise the highest trump, then the highest of the suit led. Jesters always lose.',
        ],
      },
      {
        heading: 'Scoring',
        points: [
          'Exactly right: 20 points plus 10 per trick taken.',
          'Wrong: −10 for every trick over or under.',
          'Highest total after the last round wins.',
        ],
      },
    ],
  },

  golf: {
    goal: 'Hold the lowest-scoring cards over nine holes.',
    needs: '2–6 players, one 52-card deck (two for more than four).',
    sections: [
      {
        heading: 'Setup',
        points: [
          'Each player gets six cards face down in two rows of three, and turns any two face up.',
          'The rest is the stock; turn one card up to start the discard pile.',
        ],
      },
      {
        heading: 'Your turn',
        points: [
          'Draw from the stock or the discard pile.',
          'Swap it for any of your six cards (face up or down) and discard the card you replaced — or discard the drawn card.',
          'When someone has all six face up, everyone else gets one more turn.',
        ],
      },
      {
        heading: 'Scoring',
        points: [
          'Aces 1, 2s are −2, number cards their pip value, jacks and queens 10, kings 0.',
          'A matching pair in the same column cancels to 0.',
          'Nine holes, lowest total wins.',
        ],
      },
    ],
  },

  'five-crowns': {
    goal: 'Go out with your whole hand in books and runs, over eleven rounds. Lowest wins.',
    needs: '2–7 players, the Five Crowns deck (five suits, 3s to kings, plus jokers).',
    sections: [
      {
        heading: 'Rounds',
        points: [
          'Round one deals three cards each, round two four, up to thirteen in round eleven.',
          'Wild cards change each round: threes in round one, fours in round two, up to kings. Jokers are always wild.',
        ],
      },
      {
        heading: 'Your turn',
        points: [
          'Draw from the stock or the discard pile, then discard one.',
          'A book is three or more of the same rank; a run is three or more in sequence in one suit.',
          'Once you can lay your whole hand in books and runs, go out. Everyone else takes one final turn and lays down what they can.',
        ],
      },
      {
        heading: 'Scoring',
        points: [
          'Cards left in hand count their face value: jacks 11, queens 12, kings 13.',
          'Wild cards left over cost 20 each; jokers 50.',
          'Going out scores 0. Lowest total after eleven rounds wins.',
        ],
      },
    ],
  },

  'phase-10': {
    goal: 'Be first to complete all ten phases. Ties go to the lowest score.',
    needs: '2–6 players, the Phase 10 deck.',
    sections: [
      {
        heading: 'The phases',
        points: [
          '1: two sets of 3 · 2: a set of 3 and a run of 4 · 3: a set of 4 and a run of 4',
          '4: a run of 7 · 5: a run of 8 · 6: a run of 9',
          '7: two sets of 4 · 8: seven cards of one color · 9: a set of 5 and a set of 2 · 10: a set of 5 and a set of 3',
        ],
      },
      {
        heading: 'Your turn',
        points: [
          'Ten cards each. Draw from the stock or discard pile, then discard one.',
          'Lay down your current phase when you have it. After that, you may hit — add cards onto any phase on the table.',
          'Wilds fill any spot. A skip makes the player of your choice miss a turn.',
          'The hand ends when someone discards their last card. Anyone who made their phase moves to the next one.',
        ],
      },
      {
        heading: 'Scoring',
        points: [
          'Cards left in hand: 1–9 are 5 points, 10–12 are 10, skips 15, wilds 25.',
          'The first player to complete phase ten wins; if several finish together, lowest score wins.',
        ],
      },
    ],
  },

  uno: {
    goal: 'Empty your hand first; score the cards your opponents are left holding. First to 500 wins.',
    needs: '2–10 players, an Uno deck.',
    sections: [
      {
        heading: 'Play',
        points: [
          'Seven cards each. Turn over the top card to start the discard pile.',
          'On your turn, match the top card by color, number or symbol — or play a wild. If you can’t, draw one.',
          'Skip, reverse and draw two do what they say. Wild draw four lets you name a color and makes the next player draw four.',
          'Say “Uno” when you are down to one card. Get caught not saying it and draw two.',
        ],
      },
      {
        heading: 'Scoring',
        points: [
          'The player who goes out scores the cards left in everyone else’s hand.',
          'Number cards their face value; skip, reverse and draw two are 20; wilds and wild draw four are 50.',
          'First to 500 wins.',
        ],
      },
    ],
  },

  canasta: {
    goal: 'Your partnership builds melds of the same rank, aiming for canastas. First side to 5000 wins.',
    needs: '4 players in two partnerships, two 52-card decks with four jokers.',
    sections: [
      {
        heading: 'Play',
        points: [
          'Eleven cards each. Draw two from the stock, or take the whole discard pile if you can meld its top card, then discard one.',
          'Melds are three or more cards of the same rank. Jokers and 2s are wild, but a meld needs more natural cards than wilds.',
          'A canasta is a meld of seven cards. Your side needs at least one canasta to go out.',
          'Red 3s are laid down at once and replaced; black 3s block the discard pile.',
        ],
      },
      {
        heading: 'First meld',
        points: [
          'Your side’s first meld must meet a minimum: 50 points under 1500, 90 up to 2999, 120 from 3000.',
        ],
      },
      {
        heading: 'Scoring',
        points: [
          'Natural canasta 500, mixed canasta 300. Going out 100.',
          'Each red 3 is 100 (all four is 800).',
          'Add the cards melded and subtract the cards left in hand: jokers 50, aces and 2s 20, 8 to king 10, 4 to 7 and black 3s 5.',
          'Add each side as one player here.',
        ],
      },
    ],
  },

  cribbage: {
    goal: 'Peg your way around the board first — 121 points.',
    needs: '2 players (3 or 4 also work), one 52-card deck and a cribbage board.',
    sections: [
      {
        heading: 'Deal and crib',
        points: [
          'Six cards each. Both players discard two face down to form the crib, which belongs to the dealer.',
          'The non-dealer cuts; the dealer turns up the top card as the starter. A jack scores the dealer 2 (“his heels”).',
        ],
      },
      {
        heading: 'The play',
        points: [
          'Taking turns, lay cards face up and call the running total. It may not pass 31.',
          'Score 2 for making 15 or 31, 2 for a pair, 6 for three of a kind, 12 for four, and 1 per card for runs of three or more.',
          'If you can’t play without passing 31, say “go”; the other player scores 1 for the last card.',
        ],
      },
      {
        heading: 'The show',
        points: [
          'Each hand is counted with the starter: 2 for every combination making 15, 2 per pair, 1 per card in a run, 4 for a flush (5 with the starter), and 1 for the jack of the starter’s suit (“his nobs”).',
          'Non-dealer counts first, then dealer, then the dealer counts the crib.',
          'First to 121 wins, even mid-hand.',
        ],
      },
    ],
  },

  farkle: {
    goal: 'Roll dice to bank points, without farkling. First to 10,000 wins.',
    needs: '2 or more players, six dice.',
    sections: [
      {
        heading: 'Your turn',
        points: [
          'Roll all six dice. Set aside at least one scoring die, then either bank your points or re-roll the rest.',
          'If a roll has nothing that scores, that’s a farkle: you lose everything from this turn.',
          'Score with all six dice (“hot dice”) and you may roll all six again.',
        ],
      },
      {
        heading: 'Scoring',
        points: [
          'Each 1 is 100; each 5 is 50.',
          'Three of a kind is 100 × the number (three 1s are 1,000).',
          'Four of a kind is 1,000, five 2,000, six 3,000.',
          'A 1–6 straight is 1,500; three pairs are 1,500.',
          'Many tables require 500 in one turn before you can get on the board.',
        ],
      },
      {
        heading: 'Winning',
        points: [
          'When someone reaches 10,000, everyone else gets one last turn to beat them.',
        ],
      },
    ],
  },

  countdown: {
    goal: 'Count down from 501 to exactly zero. This is the darts game 501.',
    needs: '2 or more players (or teams), a dartboard.',
    sections: [
      {
        heading: 'A turn',
        points: [
          'Throw three darts and subtract their total from your score.',
          'The outer ring doubles a number, the inner ring trebles it. The outer bull is 25, the bullseye 50.',
        ],
      },
      {
        heading: 'Finishing',
        points: [
          'You must finish on a double (the bullseye counts as double 25).',
          'Going below zero, landing on 1, or reaching zero without a double is a bust: your score goes back to where it was at the start of the turn.',
          'Enter a bust as 0 here.',
        ],
      },
      {
        heading: 'Legs',
        points: [
          'First to zero wins the leg. Play single legs, or first to a number of legs.',
        ],
      },
    ],
  },

  'poker-night': {
    goal: 'Win chips by making the best five-card hand — or by making everyone else fold. These are Texas Hold’em rules.',
    needs: '2–10 players, one 52-card deck and chips.',
    sections: [
      {
        heading: 'A hand',
        points: [
          'The two players left of the dealer post the small and big blind. Everyone gets two cards face down.',
          'Betting round, then the flop (three shared cards), betting, the turn (a fourth), betting, the river (a fifth), and a last round of betting.',
          'On your turn: fold, check (if nothing to call), call, or raise.',
          'Anyone still in at the end shows down; best five cards from their two plus the five shared wins the pot.',
        ],
      },
      {
        heading: 'Hand ranks, best first',
        points: [
          'Royal flush · straight flush · four of a kind · full house · flush · straight · three of a kind · two pair · one pair · high card.',
        ],
      },
      {
        heading: 'Blinds and scoring',
        points: [
          'The blinds clock raises the blinds every level so the game keeps moving.',
          'Enter each player’s chip change per hand, or their stack at the end of the night.',
        ],
      },
    ],
  },
};

export function rulesFor(presetId: string): GameRules | null {
  return GAME_RULES[presetId] ?? null;
}

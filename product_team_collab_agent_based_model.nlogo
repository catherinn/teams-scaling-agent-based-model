globals
[
  team-size ;; size of the product teams
  total-output ;; total output as sum of all team points with accounting for decay by disturbing a team. We are using exponential decay (6%)
  team-points ;; total number of points for a particular team
  col ;; target color of the patch to highlight the stage (performance) of the team that is on the patch
  target-patch ;; patch where we want to move the agents
  target-turtle ;; lead agent for a team, we use this property for organizing the team together
  team ;; teams that represent product development teams
  team-without-lead ;; team without the lead, we use this property for organizing the team together
  turtles-to-add ;; number of turtles to add based on the growth rate defined in the user interface
  remaining-turtles ;; number of turtles that need to be added as per turtleSlider
]

turtles-own
[
  incumbent? ;; differentiating if an agent is new or existing
  points ;; how many points of output is the team member able to produce
  senior? ;; seniority of the team member
  team-lead? ;; defining 1 person leading the team
  change-counter ;;  handling the change of points based on the team being/not being disturbed
]



;;;;;;;;;;;;;;;;;;;;;;;;
;;; Setup Procedures ;;;
;;;;;;;;;;;;;;;;;;;;;;;;

;;Procedures used in both setup and GO

;; set the seniority of the agents as per slider
to set-seniority
   set senior? random-float 100 < senioritySlider
end


;; arrange turtles into teams
to arrange-turtles
  set heading (360 / team-size - 1) * who
  forward 1
end


to setup
  clear-all
  set-default-shape turtles "person"
  repeat 5
  [
    create-turtles 1
    [
      set-seniority
      set incumbent? true
      set color blue
      set-seniority
      set team-lead? false
      ifelse senior?
      [set points 3]
      [set points 1.5]
      set team-points team-points + points
      set change-counter 1
    ]
  ]
  ask one-of turtles [set team-lead? true]
  agentset-excl-teamlead turtles

  set team-size count turtles
  ask team-without-lead [arrange-turtles]
  set total-output total-output-color-code
  set remaining-turtles turtleGrowthSlider
  reset-ticks
end



;;;;;;;;;;;;;;;;;;;;;;;
;;; Main Procedures ;;;
;;;;;;;;;;;;;;;;;;;;;;;

to go

  ;; change-counter for keeping track of the output of individual agents
  set team-points 0
  set team-size 0
  ask turtles
  [
    if change-counter > 3
    [
      set change-counter 1
      set points points + 1.5
      if points > 7.5 [set points 7.5] ;; the output of an individual is limited
    ]
     set change-counter change-counter + 1
   ]

  ;; add new team members
  ask turtles [set incumbent? true]
  set turtles-to-add adjust-growth-rate
  create-turtles turtles-to-add
  [
    set incumbent? false
    set color grey
    set team-lead? false
    set-seniority
    ifelse senior?
      [set points 3]
      [set points 1.5]
  ]

  ;; assign new team members to random teams
  ask turtles with [incumbent? = false]
  [
    let color-set remove-duplicates [color] of turtles
    let exclude-list [5]
    let col1 random-color-teams color-set exclude-list
    set color col1
    set team turtles with [color = col1]

    ask team
    [
      set points points - 1.5
      if points <= 0 [set points 0.5] ;; to make sure that at the beginning, the output doesn't go below 0.5 as there is always some very small output
      if change-counter > 1 [set change-counter 1]
    ]
    set team-size count team

    ;; split a team in case the team size is 10
    if team-size = 10
      [
        set team create-new-team color-set team
        set team-size count team
      ]

    ;; organize team together
    agentset-excl-teamlead team
    ask team-without-lead
    [
      move-to target-turtle
      arrange-turtles
    ]
  ]
  set total-output total-output-color-code
end


;;Procedures used in the GO procedure

;;set the growth rate as absolute number of agents added over a period of 12 ticks
to-report adjust-growth-rate
  set turtles-to-add random 4
  ifelse (remaining-turtles - turtles-to-add) >= 0
    [set remaining-turtles remaining-turtles - turtles-to-add]
    [set turtles-to-add 0]
   if (ticks mod 11 = 0) and (ticks != 0)
   [
     set turtles-to-add remaining-turtles + turtles-to-add
     set remaining-turtles turtleGrowthSlider
   ]
   report turtles-to-add
end


;; select a random color based on a list of colors and list of colors we want to exclude
to-report random-color-teams [color-set exclude-list];; random color except grey which we use for new team member
  let colors-except-used filter [x -> not member? x exclude-list] color-set
  let distinct-colors remove-duplicates colors-except-used
  let rand one-of distinct-colors
  report rand
end


;; find an empty patch so that the turtle teams don't overlap
to-report agents_empty_patch [agentSet]
  set target-patch nobody
  let valid-patch? true
  let has-other-turtles? false
  let random-patch nobody
  while [target-patch = nobody]
  [
    set random-patch one-of patches with [not any? turtles-here]
    ask random-patch
     [set has-other-turtles? any? (turtles-on neighbors)]
      ifelse has-other-turtles?
        [set valid-patch? false]
        [set target-patch random-patch]
  ]
  report target-patch
end


;; split random 5 members from the team and create a new team
to-report create-new-team [color-set defined-team]
  set team-points 0
  let color-range filter [ x -> not member? x  [9 49 29 129]] n-values 141 [ i -> i]
  let col2 random-color-teams  color-range color-set
  let randomTurtles n-of 5 defined-team with [team-lead? = false]
  set team-size count randomTurtles
  set target-patch agents_empty_patch randomTurtles
  ask randomTurtles
  [
    move-to target-patch
  ]
  ask one-of randomTurtles [set team-lead? true]
  ask randomTurtles
  [
    set color col2
    set team-points team-points + points
  ]

  agentset-excl-teamlead randomTurtles
  ask team-without-lead
  [
    move-to target-turtle
    arrange-turtles]

  ;; identify team that remained after split
  set defined-team defined-team with [not member? self randomTurtles]
  report defined-team
end


;;  arrange the teams around the teamlead
to agentset-excl-teamlead [selected-team]
  set target-turtle one-of selected-team with [team-lead?]
  set target-patch [patch-here] of target-turtle
  let exclude selected-team with [team-lead? = true]
  set team-without-lead selected-team with [not member? self exclude]
end


;; calculate the team output with decay for each team and change the color of the patch based on it
;; report the total output per tick
to-report total-output-color-code
  set total-output 0
  set team-size 0
  set team-points 0
  let total-output-team 0
  let color-set remove-duplicates [color] of turtles

  foreach color-set
  [
    x -> let current-team turtles with [color = x]
    set team-points sum [points] of current-team
    set team-size count current-team
    set total-output-team team-points * (0.94 ^ (team-size - 1))
    set total-output total-output + total-output-team
    set col deduce-team-stage total-output-team
    set target-patch one-of current-team with [team-lead?]
    change-patch-color col
  ]
  report total-output
end


;; change the color of the patch based on the number of points a team achieved
to change-patch-color [c]
  ask target-patch
  [
    set pcolor c
    ask neighbors
      [set pcolor c]
  ]
end


;; deduce the stage based on the number of points
to-report deduce-team-stage [total-output-team]
  set col nobody
  (ifelse
    total-output-team <= 15 [ set  col 9]
    total-output-team > 15 and total-output-team <= 20 [ set col 49]
    total-output-team > 20 and total-output-team <= 30 [ set col 29]
    [ set col 129]
  )
  report col
end




@#$#@#$#@
GRAPHICS-WINDOW
210
10
647
448
-1
-1
13.0
1
10
1
1
1
0
0
0
1
-16
16
-16
16
1
1
1
ticks
30.0

BUTTON
21
24
87
57
setup
setup
NIL
1
T
OBSERVER
NIL
NIL
NIL
NIL
1

BUTTON
129
24
192
57
go
go\ntick
NIL
1
T
OBSERVER
NIL
NIL
NIL
NIL
0

SLIDER
20
71
192
104
senioritySlider
senioritySlider
0
100
50.0
1
1
%
HORIZONTAL

PLOT
665
14
1099
349
Total output 
ticks (months)
output
0.0
50.0
0.0
100.0
true
true
"" ""
PENS
"real output" 1.0 0 -15302303 true "" "plotxy ticks total-output"
"headcount" 1.0 0 -16777216 true "" "plotxy ticks count turtles"
"perceived output" 1.0 0 -2139308 true "" "plotxy ticks (count turtles * 7.5)"

MONITOR
667
366
783
411
Number of teams
length remove-duplicates [color] of turtles
0
1
11

SLIDER
19
119
191
152
turtleGrowthSlider
turtleGrowthSlider
0
20
12.0
1
1
NIL
HORIZONTAL

MONITOR
819
366
876
411
NIL
ticks
0
1
11

MONITOR
911
366
1018
411
Number of agents
count turtles
0
1
11

@#$#@#$#@
## WHAT IS IT?

This model of scaling product development teams illustrates the behaviour of how adding new team members into a startup environment (which usually starts with one team) negatively impacts the output created by the whole product development department.
Product development teams are usually cross-functional teams of individuals from different areas (product manager, UX, developers etc.) that work in an agile environment. 

The exact rules are defined based on my empirical experience working in various companies of different sizes and incorporate 2 well-knonw theoretical concepts:

-  Classification of a group's life cycle - proposed by psychologist Bruce Tuckman in 1965
- The law of diminishing marginal productivity/returns -  first conceptualized by David Ricardo in his book "On the Principles of Political Economy and Taxation," published in 1817



## HOW IT WORKS

The seniority slider enables us to set the % of senior vs junior team members. This allows for experimenting with finding the right balance between output and cost and it can also help companies find the right strategy (e.g. some startups start with hiring only juniors while expecting the same level of output as by hiring seniors).

On setup, 1 team is created with 5 members. They have just started to work together, so they are in the forming stage, which is color-coded in the patch color around the team. The number 5 team members were chosen arbitrarily as a minimum where a team is able to build software together given its cross-functional nature.

The team grows by randomly adding new team member(s) to the existing teams, on every tick. A tick represents a time unit, which in this model is 1 month.

Once the size of one of the teams turns 10, even though the overall productivity still grows by adding a new team member, the marginal output is very small and the overall output starts decreasing soon after. Due to this, we split the team into 2 equal teams of 5 members.

The agents are assembled into individual teams (agentsets), and each team has a different color of agents.

To visually indicate the performance of the team, we are using an adapted version of the Tuckman's classification of the team life cycle (forming-storming-norming-performing), and for our modelling purposes, we are using the following criteria:

- time of the team together without interruption and interruption causing a penalty for the teams that were interrupted,
- individual output based on seniority,
- the number of team members in the team,
- adjusted by using exponential decay to account for the  Law of diminishing marginal productivity. Based on some experimentation with different values, the value of decay used will be 6%.

A total-output-team score computed based on the criteria above is translated into the color of the patches as follows: 

- forming: light grey
- storming: light yellow 
- norming: light orange
- performing: light purple



## HOW TO USE IT

Click the SETUP button to start with a single team. Click GO to add team members. 1 tick represents 1 month.

### Parameters

- senioritySlider - represents the % of seniors vs. juniors based on the strategy of the company (setting a certain % represents the % of seniors from the new joiners)
- turtleGrowthSlider - represents the absolute number of agents (new joiners) that will be added over 1 year (12 months)

### Plots
-  perceived output vs. real output

### Other outputs
- number of teams
- ticks (months)
- number of agents (members of product development)



## THINGS TO NOTICE

- the perceived output is what most leaders in organizations naively think when adding new team members.
- the real output incorporating how adding new team members disturbs the existing teams and applying the rule of diminishing marginal productivity represents a simplified version of the reality.
- having only senior team members logically creates much more output, which is how most of startup companies start.
- high growth means that the teams will be very far from their potential and will only truly start growing after multiple years of working together. Try this by setting turtleGrowthSlider = 20. In this case, the teams will be unfunctional with very low output for 3 years and will start picking up in productivity after that.
- one team without new team members can be surprisingly effective in a very short time. Of course, there is a limit to their max output. Try this with turtleGrowthSlider = 0.
- see how randomly the real output behaves with a low number of ticks. This is because of the low number of teams, where it makes a huge difference to which team the new joiners are added.



## THINGS TO TRY

- set the turtleGrowthSlider = 20 and see how long the teams will be unfunctional
- set the turtleGrowthSlide = 0 and see how quickly the teams will become productive. Also, see the limit in their output.
- play around with the different % of senior agents and notice how the output changes.



## EXTENDING THE MODEL

There is a potential to further grow this model to account for various other factors that can influence the team performance:

- adjust the growth rate of the company for every year -> currently we assume , there is a constant yearly growth as per the turtleGrowthSlider.
- considering further collaboration based on previous links between individuals. 
- fluctuation rate that can be influenced by
	- company culture,
	- growth possibilities (e.g. for seniors the growth opportunities are often limited and mentoring juniors can be one of the motivations to stay and grow).
- considering different timeframes for transitioning between the performance stages based on Tuckman's definition.
	- currently, we consider transitioning from one stage to another after 4 ticks (4 months), however, this can vary greatly based on the investments of the company into levelling up the teams. Also transitioning from storming to norming and later performing can take much more time, and is also dependent on previous links between the team members (as already mentioned above) and complementary skills.
- accounting for the last stage defined by Tuckman  = adjourning in the form of shuffling around teams in certain periods, which can greatly improve the motivation of team members for which after the performance stage, the output might start declining as the individuals lack growth opportunities.
- the concept of accumulating tech debt due to the inexperience of junior team members if the proportion of juniors vs seniors is not well balanced.
- incorporating the growth of team members from juniors to seniors -> the potential model does not account for this fact properly, only rudimentarily in allowing juniors to organically achieve the max output points.

## NETLOGO FEATURES

- working with individual agents and grouping them into agentsets 
- grouping the agentsets together visually on the interface and coloring the patches based on the output of the agentset
- the final output depending on the activity of agentset and individual agents as well as their inactivity with the help of a counter logic
- the logic of adding a selected total number of agents over a defined period randomly


## RELATED MODELS

Team Assembly - a model of collaboration networks illustrates how the behavior of individuals in assembling small teams for short-term projects can give rise to a variety of large-scale network structures over time 

## CREDITS AND REFERENCES

If you mention this model or the NetLogo software in a publication, we ask that you include the citations below.

For the model itself:
Lechner K., 2023. NetLogo Product Team Scaling model. 

Please cite the NetLogo software as:

Wilensky, U. (1999). NetLogo. http://ccl.northwestern.edu/netlogo/. Center for Connected Learning and Computer-Based Modeling, Northwestern University, Evanston, IL.

## COPYRIGHT AND LICENSE
This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License. To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0 or send a letter to Creative Commons, 559 Nathan Abbott Way, Stanford, California 94305, USA.

@#$#@#$#@
default
true
0
Polygon -7500403 true true 150 5 40 250 150 205 260 250

airplane
true
0
Polygon -7500403 true true 150 0 135 15 120 60 120 105 15 165 15 195 120 180 135 240 105 270 120 285 150 270 180 285 210 270 165 240 180 180 285 195 285 165 180 105 180 60 165 15

arrow
true
0
Polygon -7500403 true true 150 0 0 150 105 150 105 293 195 293 195 150 300 150

box
false
0
Polygon -7500403 true true 150 285 285 225 285 75 150 135
Polygon -7500403 true true 150 135 15 75 150 15 285 75
Polygon -7500403 true true 15 75 15 225 150 285 150 135
Line -16777216 false 150 285 150 135
Line -16777216 false 150 135 15 75
Line -16777216 false 150 135 285 75

bug
true
0
Circle -7500403 true true 96 182 108
Circle -7500403 true true 110 127 80
Circle -7500403 true true 110 75 80
Line -7500403 true 150 100 80 30
Line -7500403 true 150 100 220 30

butterfly
true
0
Polygon -7500403 true true 150 165 209 199 225 225 225 255 195 270 165 255 150 240
Polygon -7500403 true true 150 165 89 198 75 225 75 255 105 270 135 255 150 240
Polygon -7500403 true true 139 148 100 105 55 90 25 90 10 105 10 135 25 180 40 195 85 194 139 163
Polygon -7500403 true true 162 150 200 105 245 90 275 90 290 105 290 135 275 180 260 195 215 195 162 165
Polygon -16777216 true false 150 255 135 225 120 150 135 120 150 105 165 120 180 150 165 225
Circle -16777216 true false 135 90 30
Line -16777216 false 150 105 195 60
Line -16777216 false 150 105 105 60

car
false
0
Polygon -7500403 true true 300 180 279 164 261 144 240 135 226 132 213 106 203 84 185 63 159 50 135 50 75 60 0 150 0 165 0 225 300 225 300 180
Circle -16777216 true false 180 180 90
Circle -16777216 true false 30 180 90
Polygon -16777216 true false 162 80 132 78 134 135 209 135 194 105 189 96 180 89
Circle -7500403 true true 47 195 58
Circle -7500403 true true 195 195 58

circle
false
0
Circle -7500403 true true 0 0 300

circle 2
false
0
Circle -7500403 true true 0 0 300
Circle -16777216 true false 30 30 240

cow
false
0
Polygon -7500403 true true 200 193 197 249 179 249 177 196 166 187 140 189 93 191 78 179 72 211 49 209 48 181 37 149 25 120 25 89 45 72 103 84 179 75 198 76 252 64 272 81 293 103 285 121 255 121 242 118 224 167
Polygon -7500403 true true 73 210 86 251 62 249 48 208
Polygon -7500403 true true 25 114 16 195 9 204 23 213 25 200 39 123

cylinder
false
0
Circle -7500403 true true 0 0 300

dot
false
0
Circle -7500403 true true 90 90 120

face happy
false
0
Circle -7500403 true true 8 8 285
Circle -16777216 true false 60 75 60
Circle -16777216 true false 180 75 60
Polygon -16777216 true false 150 255 90 239 62 213 47 191 67 179 90 203 109 218 150 225 192 218 210 203 227 181 251 194 236 217 212 240

face neutral
false
0
Circle -7500403 true true 8 7 285
Circle -16777216 true false 60 75 60
Circle -16777216 true false 180 75 60
Rectangle -16777216 true false 60 195 240 225

face sad
false
0
Circle -7500403 true true 8 8 285
Circle -16777216 true false 60 75 60
Circle -16777216 true false 180 75 60
Polygon -16777216 true false 150 168 90 184 62 210 47 232 67 244 90 220 109 205 150 198 192 205 210 220 227 242 251 229 236 206 212 183

fish
false
0
Polygon -1 true false 44 131 21 87 15 86 0 120 15 150 0 180 13 214 20 212 45 166
Polygon -1 true false 135 195 119 235 95 218 76 210 46 204 60 165
Polygon -1 true false 75 45 83 77 71 103 86 114 166 78 135 60
Polygon -7500403 true true 30 136 151 77 226 81 280 119 292 146 292 160 287 170 270 195 195 210 151 212 30 166
Circle -16777216 true false 215 106 30

flag
false
0
Rectangle -7500403 true true 60 15 75 300
Polygon -7500403 true true 90 150 270 90 90 30
Line -7500403 true 75 135 90 135
Line -7500403 true 75 45 90 45

flower
false
0
Polygon -10899396 true false 135 120 165 165 180 210 180 240 150 300 165 300 195 240 195 195 165 135
Circle -7500403 true true 85 132 38
Circle -7500403 true true 130 147 38
Circle -7500403 true true 192 85 38
Circle -7500403 true true 85 40 38
Circle -7500403 true true 177 40 38
Circle -7500403 true true 177 132 38
Circle -7500403 true true 70 85 38
Circle -7500403 true true 130 25 38
Circle -7500403 true true 96 51 108
Circle -16777216 true false 113 68 74
Polygon -10899396 true false 189 233 219 188 249 173 279 188 234 218
Polygon -10899396 true false 180 255 150 210 105 210 75 240 135 240

house
false
0
Rectangle -7500403 true true 45 120 255 285
Rectangle -16777216 true false 120 210 180 285
Polygon -7500403 true true 15 120 150 15 285 120
Line -16777216 false 30 120 270 120

leaf
false
0
Polygon -7500403 true true 150 210 135 195 120 210 60 210 30 195 60 180 60 165 15 135 30 120 15 105 40 104 45 90 60 90 90 105 105 120 120 120 105 60 120 60 135 30 150 15 165 30 180 60 195 60 180 120 195 120 210 105 240 90 255 90 263 104 285 105 270 120 285 135 240 165 240 180 270 195 240 210 180 210 165 195
Polygon -7500403 true true 135 195 135 240 120 255 105 255 105 285 135 285 165 240 165 195

line
true
0
Line -7500403 true 150 0 150 300

line half
true
0
Line -7500403 true 150 0 150 150

pentagon
false
0
Polygon -7500403 true true 150 15 15 120 60 285 240 285 285 120

person
false
0
Circle -7500403 true true 110 5 80
Polygon -7500403 true true 105 90 120 195 90 285 105 300 135 300 150 225 165 300 195 300 210 285 180 195 195 90
Rectangle -7500403 true true 127 79 172 94
Polygon -7500403 true true 195 90 240 150 225 180 165 105
Polygon -7500403 true true 105 90 60 150 75 180 135 105

plant
false
0
Rectangle -7500403 true true 135 90 165 300
Polygon -7500403 true true 135 255 90 210 45 195 75 255 135 285
Polygon -7500403 true true 165 255 210 210 255 195 225 255 165 285
Polygon -7500403 true true 135 180 90 135 45 120 75 180 135 210
Polygon -7500403 true true 165 180 165 210 225 180 255 120 210 135
Polygon -7500403 true true 135 105 90 60 45 45 75 105 135 135
Polygon -7500403 true true 165 105 165 135 225 105 255 45 210 60
Polygon -7500403 true true 135 90 120 45 150 15 180 45 165 90

sheep
false
15
Circle -1 true true 203 65 88
Circle -1 true true 70 65 162
Circle -1 true true 150 105 120
Polygon -7500403 true false 218 120 240 165 255 165 278 120
Circle -7500403 true false 214 72 67
Rectangle -1 true true 164 223 179 298
Polygon -1 true true 45 285 30 285 30 240 15 195 45 210
Circle -1 true true 3 83 150
Rectangle -1 true true 65 221 80 296
Polygon -1 true true 195 285 210 285 210 240 240 210 195 210
Polygon -7500403 true false 276 85 285 105 302 99 294 83
Polygon -7500403 true false 219 85 210 105 193 99 201 83

square
false
0
Rectangle -7500403 true true 30 30 270 270

square 2
false
0
Rectangle -7500403 true true 30 30 270 270
Rectangle -16777216 true false 60 60 240 240

star
false
0
Polygon -7500403 true true 151 1 185 108 298 108 207 175 242 282 151 216 59 282 94 175 3 108 116 108

target
false
0
Circle -7500403 true true 0 0 300
Circle -16777216 true false 30 30 240
Circle -7500403 true true 60 60 180
Circle -16777216 true false 90 90 120
Circle -7500403 true true 120 120 60

tree
false
0
Circle -7500403 true true 118 3 94
Rectangle -6459832 true false 120 195 180 300
Circle -7500403 true true 65 21 108
Circle -7500403 true true 116 41 127
Circle -7500403 true true 45 90 120
Circle -7500403 true true 104 74 152

triangle
false
0
Polygon -7500403 true true 150 30 15 255 285 255

triangle 2
false
0
Polygon -7500403 true true 150 30 15 255 285 255
Polygon -16777216 true false 151 99 225 223 75 224

truck
false
0
Rectangle -7500403 true true 4 45 195 187
Polygon -7500403 true true 296 193 296 150 259 134 244 104 208 104 207 194
Rectangle -1 true false 195 60 195 105
Polygon -16777216 true false 238 112 252 141 219 141 218 112
Circle -16777216 true false 234 174 42
Rectangle -7500403 true true 181 185 214 194
Circle -16777216 true false 144 174 42
Circle -16777216 true false 24 174 42
Circle -7500403 false true 24 174 42
Circle -7500403 false true 144 174 42
Circle -7500403 false true 234 174 42

turtle
true
0
Polygon -10899396 true false 215 204 240 233 246 254 228 266 215 252 193 210
Polygon -10899396 true false 195 90 225 75 245 75 260 89 269 108 261 124 240 105 225 105 210 105
Polygon -10899396 true false 105 90 75 75 55 75 40 89 31 108 39 124 60 105 75 105 90 105
Polygon -10899396 true false 132 85 134 64 107 51 108 17 150 2 192 18 192 52 169 65 172 87
Polygon -10899396 true false 85 204 60 233 54 254 72 266 85 252 107 210
Polygon -7500403 true true 119 75 179 75 209 101 224 135 220 225 175 261 128 261 81 224 74 135 88 99

wheel
false
0
Circle -7500403 true true 3 3 294
Circle -16777216 true false 30 30 240
Line -7500403 true 150 285 150 15
Line -7500403 true 15 150 285 150
Circle -7500403 true true 120 120 60
Line -7500403 true 216 40 79 269
Line -7500403 true 40 84 269 221
Line -7500403 true 40 216 269 79
Line -7500403 true 84 40 221 269

wolf
false
0
Polygon -16777216 true false 253 133 245 131 245 133
Polygon -7500403 true true 2 194 13 197 30 191 38 193 38 205 20 226 20 257 27 265 38 266 40 260 31 253 31 230 60 206 68 198 75 209 66 228 65 243 82 261 84 268 100 267 103 261 77 239 79 231 100 207 98 196 119 201 143 202 160 195 166 210 172 213 173 238 167 251 160 248 154 265 169 264 178 247 186 240 198 260 200 271 217 271 219 262 207 258 195 230 192 198 210 184 227 164 242 144 259 145 284 151 277 141 293 140 299 134 297 127 273 119 270 105
Polygon -7500403 true true -1 195 14 180 36 166 40 153 53 140 82 131 134 133 159 126 188 115 227 108 236 102 238 98 268 86 269 92 281 87 269 103 269 113

x
false
0
Polygon -7500403 true true 270 75 225 30 30 225 75 270
Polygon -7500403 true true 30 75 75 30 270 225 225 270
@#$#@#$#@
NetLogo 6.3.0
@#$#@#$#@
@#$#@#$#@
@#$#@#$#@
@#$#@#$#@
@#$#@#$#@
default
0.0
-0.2 0 0.0 1.0
0.0 1 1.0 0.0
0.2 0 0.0 1.0
link direction
true
0
Line -7500403 true 150 150 90 180
Line -7500403 true 150 150 210 180
@#$#@#$#@
0
@#$#@#$#@
